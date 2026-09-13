import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Furniture, Plant } from './Furniture';
import { catalog, clampWallOffset, corners, doorZone, wallLength, type DecorationConfig, type Item, type Kind, type Layout, type Wall, type WindowConfig } from '../shared/layout';

type ArchitectureSelection={type:'window'|'decoration';id:string};
type ArchitectureDrag={type:'window'|'decoration';id:string;wall:Wall;mode:'move'|'start'|'end';offset:number;width:number};
type Props={layout:Layout;selected:string|null;selectedArchitecture:ArchitectureSelection|null;onSelect:(id:string|null)=>void;onSelectArchitecture:(selection:ArchitectureSelection)=>void;onMove:(id:string,x:number,z:number)=>void;onArchitectureChange:(type:'window'|'decoration',id:string,patch:{offset:number;width:number})=>void;onAdd:(kind:Kind,x:number,z:number)=>void;view:'2D'|'3D';zoom:number;reset:number;preview:boolean;showClearance:boolean;transparentFrontWalls:boolean;canvasClassName?:string};
function Art({position,rotation=0,variant=0,scale=1,ghost=false}:{position:[number,number,number];rotation?:number;variant?:number;scale?:number|[number,number,number];ghost?:boolean}){
  return <group position={position} rotation={[0,rotation,0]} scale={scale}>
    <Box s={[.47,.63,.035]} color="#a1835e" wood transparent={ghost} opacity={ghost?.16:1}/><Box p={[0,0,.023]} s={[.415,.575,.012]} color="#e8ddc6" transparent={ghost} opacity={ghost?.16:1}/>
    <Box p={[0,-.03,.032]} s={[.34,.43,.01]} color={variant?'#abac93':'#c0a581'} transparent={ghost} opacity={ghost?.16:1}/>
    <mesh position={[0,-.13,.044]}><shapeGeometry args={[new THREE.Shape([new THREE.Vector2(-.17,-.11),new THREE.Vector2(.17,-.11),new THREE.Vector2(.17,.08),new THREE.Vector2(.04,.17),new THREE.Vector2(-.07,.09),new THREE.Vector2(-.17,.13)])]}/><meshStandardMaterial side={THREE.DoubleSide} color={variant?'#6f755e':'#475c59'} transparent={ghost} opacity={ghost?.16:1}/></mesh>
  </group>;
}
function wallTransform(layout:Layout,wall:Wall,offset:number,y:number,inset=.07,inside=true):[number,number,number] {
  if(wall==='north')return [offset,y,-layout.depth/2+(inside?inset:-inset)];
  if(wall==='south')return [offset,y,layout.depth/2-(inside?inset:-inset)];
  if(wall==='east')return [layout.width/2-(inside?inset:-inset),y,offset];
  return [-layout.width/2+(inside?inset:-inset),y,offset];
}
function wallRotation(wall:Wall){return wall==='east'?Math.PI/2:wall==='west'?-Math.PI/2:wall==='north'?Math.PI:0;}
function ResizeHandles({width,height,top,onPointerDown,onPointerMove,onPointerUp}:{width:number;height:number;top:boolean;onPointerDown:(event:ThreeEvent<PointerEvent>,mode:'start'|'end')=>void;onPointerMove:(event:ThreeEvent<PointerEvent>)=>void;onPointerUp:(event:ThreeEvent<PointerEvent>)=>void}){
  const y=top?.02:0;
  return <>{[-1,1].map((edge)=><mesh key={edge} position={[edge*width/2,y,-.13]} onPointerDown={(event)=>{event.stopPropagation();onPointerDown(event,edge<0?'start':'end');}} onPointerMove={onPointerMove} onPointerUp={onPointerUp}><boxGeometry args={[.1,top?.1:.1,.1]}/><meshBasicMaterial color="#2c7475"/></mesh>)}</>;
}
function WindowUnit({layout,window,top,selected,ghost,inside=true,interactive=true,onPointerDown,onResize,onPointerMove,onPointerUp}:{layout:Layout;window:WindowConfig;top:boolean;selected:boolean;ghost:boolean;inside?:boolean;interactive?:boolean;onPointerDown?:((event:ThreeEvent<PointerEvent>)=>void);onResize?:((event:ThreeEvent<PointerEvent>,mode:'start'|'end')=>void);onPointerMove?:((event:ThreeEvent<PointerEvent>)=>void);onPointerUp?:((event:ThreeEvent<PointerEvent>)=>void)}){
  const height=top?.16:window.height, y=top?.08:window.sill+window.height/2;
  return <group position={wallTransform(layout,window.wall,window.offset,y,inside?.07:.18,inside)} rotation={[0,wallRotation(window.wall),0]} onPointerDown={interactive?onPointerDown:undefined} onPointerMove={interactive?onPointerMove:undefined} onPointerUp={interactive?onPointerUp:undefined}>
    {top?<Box s={[window.width,.12,.14]} color="#92bdbc" transparent={ghost} opacity={ghost?.15:1}/>:<>
      <Box s={[window.width+.16,height+.16,.1]} color="#e8e2d4" wood transparent={ghost} opacity={ghost?.15:1}/>
      <Box p={[0,0,.06]} s={[window.width,height,.025]} color="#d9e7df" transparent={ghost} opacity={ghost?.15:1}/>
      {[-.5,.5].map((x)=><Box key={x} p={[x*window.width,0,.09]} s={[.035,height,.03]} color="#797c6d" transparent={ghost} opacity={ghost?.15:1}/>)}
      <Box p={[0,0,.09]} s={[window.width,.035,.03]} color="#797c6d" transparent={ghost} opacity={ghost?.15:1}/>
    </>}
    {selected && interactive && onResize && onPointerMove && onPointerUp && <ResizeHandles width={window.width} height={height} top={top} onPointerDown={onResize} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />}
  </group>;
}
function DoorUnit({layout,top,ghost,inside=true}:{layout:Layout;top:boolean;ghost:boolean;inside?:boolean}){
  const door=layout.door, y=top?.08:1.05;
  return <group position={wallTransform(layout,door.wall,door.offset,y,inside?.08:.18,inside)} rotation={[0,wallRotation(door.wall),0]}>
    {top?<Box s={[door.width,.12,door.clearance]} color="#c89a68" transparent={ghost} opacity={ghost?.15:1}/>:<>
      <Box p={[-door.width/2-.055,0,0]} s={[.11,2.16,.15]} color="#d8d0c0" transparent={ghost} opacity={ghost?.15:1}/><Box p={[door.width/2+.055,0,0]} s={[.11,2.16,.15]} color="#d8d0c0" transparent={ghost} opacity={ghost?.15:1}/>
      <Box p={[0,1.08,0]} s={[door.width+.22,.12,.15]} color="#ddd5c7" transparent={ghost} opacity={ghost?.15:1}/>
      <Box p={[0,0,.008]} s={[door.width,2.02,.05]} wood color="#bd9d73" transparent={ghost} opacity={ghost?.15:1}/>
      <Box p={[door.width*.36,.0,.05]} s={[.04,.12,.035]} color="#514b3c" transparent={ghost} opacity={ghost?.15:1}/>
    </>}
  </group>;
}
function WallDecoration({layout,decoration,top,selected,ghost,onPointerDown,onResize,onPointerMove,onPointerUp}:{layout:Layout;decoration:DecorationConfig;top:boolean;selected:boolean;ghost:boolean;onPointerDown:(event:ThreeEvent<PointerEvent>)=>void;onResize:(event:ThreeEvent<PointerEvent>,mode:'start'|'end')=>void;onPointerMove:(event:ThreeEvent<PointerEvent>)=>void;onPointerUp:(event:ThreeEvent<PointerEvent>)=>void}){
  const y=top?.12:decoration.kind==='wall-shelf'?1.25:1.72,position=wallTransform(layout,decoration.wall,decoration.offset,y,.085),rotation=wallRotation(decoration.wall);
  const handles=selected&&<ResizeHandles width={decoration.width} height={top?.16:decoration.height} top={top} onPointerDown={onResize} onPointerMove={onPointerMove} onPointerUp={onPointerUp}/>;
  if(decoration.kind==='painting')return <group position={position} rotation={[0,rotation,0]} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}><Art position={[0,0,.05]} variant={decoration.color==='#6f755e'?1:0} scale={[decoration.width/.47,decoration.height/.63,1]} ghost={ghost}/>{handles}</group>;
  if(decoration.kind==='mirror')return <group position={position} rotation={[0,rotation,0]} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}><Box s={[decoration.width,decoration.height,.05]} color="#b7a98e" transparent={ghost} opacity={ghost?.15:1}/><Box p={[0,0,.035]} s={[decoration.width-.1,decoration.height-.1,.025]} color={decoration.color} transparent={ghost} opacity={ghost?.15:1}/>{handles}</group>;
  if(decoration.kind==='wall-shelf')return <group position={position} rotation={[0,rotation,0]} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}><Box s={[decoration.width,.12,.24]} color="#b99565" wood transparent={ghost} opacity={ghost?.15:1}/><Box p={[0,.25,0]} s={[.06,.42,.06]} color="#617548" transparent={ghost} opacity={ghost?.15:1}/>{handles}</group>;
  return <group position={position} rotation={[0,rotation,0]} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} visible={!ghost} scale={[decoration.width/.42,decoration.height/.8,decoration.width/.42]}><Plant/>{handles}</group>;
}
function Architecture({layout,top,clearance,transparentFrontWalls,selectedArchitecture,onArchitecturePointerDown,onArchitectureResize,onArchitecturePointerMove,onArchitecturePointerUp}:{layout:Layout;top:boolean;clearance:boolean;transparentFrontWalls:boolean;selectedArchitecture:ArchitectureSelection|null;onArchitecturePointerDown:(event:ThreeEvent<PointerEvent>,selection:ArchitectureSelection,mode:'move'|'start'|'end')=>void;onArchitectureResize:(event:ThreeEvent<PointerEvent>,selection:ArchitectureSelection,mode:'start'|'end')=>void;onArchitecturePointerMove:(event:ThreeEvent<PointerEvent>)=>void;onArchitecturePointerUp:(event:ThreeEvent<PointerEvent>)=>void}){
  const {width:w,depth:d}=layout,wall=top?.10:2.65,door=doorZone(layout);
  const frontWall=(which:Wall)=>transparentFrontWalls&&(which==='south'||which==='east');
  const planks=useMemo(()=>{
    const result:{x:number;z:number;w:number;color:string}[]=[];const rows=Math.ceil(d/.19);
    for(let row=0;row<rows;row++){let x=-w/2,segment=0;while(x<w/2-.001){const length=Math.min(segment===0?.55+(row%3)*.36:1.24,w/2-x);result.push({x:x+length/2,z:-d/2+(row+.5)*d/rows,w:length,color:['#d7bb96','#d4b18b','#ddbf9a','#cfad83','#ddc3a0'][(row*3+segment*7)%5]});x+=length;segment++;}}
    return result;
  },[w,d]);
  const doorCorners=corners(door).map(point=>[point.x,.055,point.z] as [number,number,number]);
  doorCorners.push(doorCorners[0]);
  return <group>
    <Box p={[0,-.13,0]} s={[w+.22,.24,d+.22]} color="#bdb6a7"/>
    {planks.map((p,i)=><Box key={i} p={[p.x,.006,p.z]} s={[p.w-.007,.025,d/Math.ceil(d/.19)-.006]} color={p.color} wood r={.001}/>)}
    <Box p={[-w/2-.055,wall/2,-.01]} s={[.11,wall,d+.1]} color="#d9d0bf" transparent={frontWall('west')} opacity={frontWall('west')?.14:1}/><Box p={[w/2+.055,.16,0]} s={[.11,.32,d+.1]} color="#d8d0c1" transparent={frontWall('east')} opacity={frontWall('east')?.14:1}/>
    <Box p={[0,.065,d/2+.055]} s={[w+.2,.13,.11]} color="#d8d0c1" transparent={frontWall('south')} opacity={frontWall('south')?.14:1}/><Box p={[0,.065,-d/2-.055]} s={[w+.2,.13,.11]} color="#d8d0c1"/>
    {!top&&<><Box p={[0,1.325,-d/2-.055]} s={[w+.2,2.65,.11]} color="#d4c9b5"/><Box p={[0,1.325,d/2+.055]} s={[w+.2,2.65,.11]} color="#d4c9b5" transparent={frontWall('south')} opacity={frontWall('south')?.14:1}/><Box p={[-w/2-.055,1.325,0]} s={[.11,2.65,d+.1]} color="#d9d0bf"/><Box p={[w/2+.055,1.325,0]} s={[.11,2.65,d+.1]} color="#d8d0c1" transparent={frontWall('east')} opacity={frontWall('east')?.14:1}/></>}
    {layout.windows.map(window=><group key={window.id}><WindowUnit layout={layout} window={window} top={top} selected={selectedArchitecture?.type==='window'&&selectedArchitecture.id===window.id} ghost={frontWall(window.wall)} onPointerDown={(event)=>onArchitecturePointerDown(event,{type:'window',id:window.id},'move')} onResize={(event,mode)=>onArchitectureResize(event,{type:'window',id:window.id},mode)} onPointerMove={onArchitecturePointerMove} onPointerUp={onArchitecturePointerUp}/>{!top&&<WindowUnit layout={layout} window={window} top={false} selected={false} ghost={frontWall(window.wall)} inside={false} interactive={false}/>}</group>)}
    <DoorUnit layout={layout} top={top} ghost={frontWall(layout.door.wall)}/>
    {!top&&<DoorUnit layout={layout} top={false} ghost={frontWall(layout.door.wall)} inside={false}/>}
    {layout.decorations.map(decoration=><WallDecoration key={decoration.id} layout={layout} decoration={decoration} top={top} selected={selectedArchitecture?.type==='decoration'&&selectedArchitecture.id===decoration.id} ghost={frontWall(decoration.wall)} onPointerDown={(event)=>onArchitecturePointerDown(event,{type:'decoration',id:decoration.id},'move')} onResize={(event,mode)=>onArchitectureResize(event,{type:'decoration',id:decoration.id},mode)} onPointerMove={onArchitecturePointerMove} onPointerUp={onArchitecturePointerUp}/>)}
    {(clearance||top)&&<><mesh rotation={[-Math.PI/2,0,0]} position={[door.x,.03,door.z]}><planeGeometry args={[door.width,door.depth]}/><meshBasicMaterial color="#d3a365" transparent opacity={.13} depthWrite={false}/></mesh><Line points={doorCorners} color="#b89d79" dashed dashSize={.06} gapSize={.04} lineWidth={1}/></>}
    {top&&<><Html position={[0,.1,d/2+.3]} center><span className="measure">{w.toFixed(1)} m</span></Html><Html position={[-w/2-.35,.1,0]} center><span className="measure">{d.toFixed(1)} m</span></Html>{layout.windows.map(window=><Html key={`label-${window.id}`} position={wallTransform(layout,window.wall,window.offset,.1,.2)} center><span className="measure">WINDOW</span></Html>)}</>}
  </group>;
}
function wallHitOffset(event:ThreeEvent<PointerEvent>,layout:Layout,wall:Wall,top:boolean){
  const hit=new THREE.Vector3();
  const plane=top?new THREE.Plane(new THREE.Vector3(0,1,0),0):wall==='north'?new THREE.Plane(new THREE.Vector3(0,0,1),layout.depth/2):wall==='south'?new THREE.Plane(new THREE.Vector3(0,0,1),-layout.depth/2):wall==='east'?new THREE.Plane(new THREE.Vector3(1,0,0),-layout.width/2):new THREE.Plane(new THREE.Vector3(1,0,0),layout.width/2);
  if(!event.ray.intersectPlane(plane,hit))return null;
  return wall==='north'||wall==='south'?hit.x:hit.z;
}
function Scene(p:Props){
  const {camera,gl,size}=useThree();const controls=useRef<any>(null);
  const [drag,setDrag]=useState<{id:string;offset:THREE.Vector3;start:THREE.Vector3;current:THREE.Vector3}|null>(null);
  const [draft,setDraft]=useState<{id:string;x:number;z:number}|null>(null);
  const [architectureDrag,setArchitectureDrag]=useState<ArchitectureDrag|null>(null);
  const [architectureDraft,setArchitectureDraft]=useState<{offset:number;width:number}|null>(null);
  const plane=useMemo(()=>new THREE.Plane(new THREE.Vector3(0,1,0),0),[]),top=p.view==='2D';
  const visualLayout=useMemo(()=>{
    if(!architectureDrag||!architectureDraft)return p.layout;
    if(architectureDrag.type==='window')return {...p.layout,windows:p.layout.windows.map(window=>window.id===architectureDrag.id?{...window,...architectureDraft}:window)};
    return {...p.layout,decorations:p.layout.decorations.map(decoration=>decoration.id===architectureDrag.id?{...decoration,...architectureDraft}:decoration)};
  },[architectureDrag,architectureDraft,p.layout]);
  useEffect(()=>{camera.position.set(...(top?[0,12,.001]:[7.3,10.5,12.8]) as [number,number,number]);camera.lookAt(0,0,0);if(controls.current){controls.current.target.set(0,top?0:.55,0);controls.current.update();}},[camera,top,p.reset]);
  useEffect(()=>{const cam=camera as THREE.OrthographicCamera;cam.zoom=Math.min(size.width/(p.layout.width+2.25),size.height/(p.layout.depth+2.25))*p.zoom;cam.updateProjectionMatrix();},[camera,size,p.zoom,p.layout.width,p.layout.depth,top]);
  useEffect(()=>{
    const drop=(event:DragEvent)=>{event.preventDefault();const kind=event.dataTransfer?.getData('application/roomshift') as Kind;if(!kind||!(kind in catalog)||p.preview)return;const bounds=gl.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),camera);const hit=new THREE.Vector3();if(ray.ray.intersectPlane(plane,hit))p.onAdd(kind,hit.x,hit.z);};
    const over=(e:DragEvent)=>{e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy';};gl.domElement.addEventListener('drop',drop);gl.domElement.addEventListener('dragover',over);return ()=>{gl.domElement.removeEventListener('drop',drop);gl.domElement.removeEventListener('dragover',over);};
  },[camera,gl,plane,p.onAdd,p.preview]);
  const begin=(e:ThreeEvent<PointerEvent>,item:Item)=>{if(p.preview)return;e.stopPropagation();p.onSelect(item.id);if(item.locked||e.button!==0)return;const hit=new THREE.Vector3();if(!e.ray.intersectPlane(plane,hit))return;(e.target as Element).setPointerCapture(e.pointerId);setDrag({id:item.id,offset:new THREE.Vector3(item.x,0,item.z).sub(hit),start:hit.clone(),current:new THREE.Vector3(item.x,0,item.z)});if(controls.current)controls.current.enabled=false;gl.domElement.style.cursor='grabbing';};
  const beginArchitecture=(e:ThreeEvent<PointerEvent>,selection:ArchitectureSelection,mode:'move'|'start'|'end')=>{if(p.preview)return;e.stopPropagation();p.onSelectArchitecture(selection);const feature=selection.type==='window'?p.layout.windows.find(window=>window.id===selection.id):p.layout.decorations.find(decoration=>decoration.id===selection.id);if(!feature)return;const hit=wallHitOffset(e,p.layout,feature.wall,top);if(hit===null)return;(e.target as Element).setPointerCapture(e.pointerId);setArchitectureDrag({type:selection.type,id:selection.id,wall:feature.wall,mode,offset:feature.offset,width:feature.width});setArchitectureDraft({offset:feature.offset,width:feature.width});if(controls.current)controls.current.enabled=false;gl.domElement.style.cursor=mode==='move'?'grabbing':'ew-resize';};
  const move=(e:ThreeEvent<PointerEvent>)=>{
    if(architectureDrag){e.stopPropagation();const coordinate=wallHitOffset(e,p.layout,architectureDrag.wall,top);if(coordinate===null)return;const minimum=architectureDrag.type==='window'?.4:.2,current=architectureDraft||{offset:architectureDrag.offset,width:architectureDrag.width};let offset=current.offset,width=current.width;const left=architectureDrag.offset-architectureDrag.width/2,right=architectureDrag.offset+architectureDrag.width/2;if(architectureDrag.mode==='move'){offset=clampWallOffset(p.layout,architectureDrag.wall,coordinate,width);}else if(architectureDrag.mode==='start'){const nextLeft=Math.min(coordinate,right-minimum);offset=(nextLeft+right)/2;width=right-nextLeft;}else{const nextRight=Math.max(coordinate,left+minimum);offset=(left+nextRight)/2;width=nextRight-left;}offset=clampWallOffset(p.layout,architectureDrag.wall,offset,width);setArchitectureDraft({offset:Math.round(offset*100)/100,width:Math.round(width*100)/100});return;}
    if(!drag)return;e.stopPropagation();const hit=new THREE.Vector3();if(!e.ray.intersectPlane(plane,hit))return;hit.add(drag.offset);drag.current.set(Math.round(hit.x*20)/20,0,Math.round(hit.z*20)/20);setDraft({id:drag.id,x:drag.current.x,z:drag.current.z});
  };
  const end=(e:ThreeEvent<PointerEvent>)=>{
    if(architectureDrag){e.stopPropagation();(e.target as Element).releasePointerCapture(e.pointerId);const draft=architectureDraft;if(draft)p.onArchitectureChange(architectureDrag.type,architectureDrag.id,draft);setArchitectureDrag(null);setArchitectureDraft(null);if(controls.current)controls.current.enabled=true;gl.domElement.style.cursor='grab';return;}
    if(!drag)return;e.stopPropagation();(e.target as Element).releasePointerCapture(e.pointerId);p.onMove(drag.id,drag.current.x,drag.current.z);setDrag(null);setDraft(null);if(controls.current)controls.current.enabled=true;gl.domElement.style.cursor='grab';
  };
  return <><color attach="background" args={['#f4f1e9']}/><ambientLight intensity={.9}/><hemisphereLight args={['#fff9ed','#a79b83',1.5]}/><directionalLight position={[-3,9,3]} intensity={2.6} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-normalBias={.025} shadow-bias={-.0002} shadow-radius={4}/><directionalLight position={[3,5,-4]} intensity={1.2} color="#fff4d8"/><mesh rotation={[-Math.PI/2,0,0]} position={[0,-.265,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.14}/></mesh>
    <Architecture layout={visualLayout} top={top} clearance={p.showClearance} transparentFrontWalls={p.transparentFrontWalls} selectedArchitecture={p.selectedArchitecture} onArchitecturePointerDown={beginArchitecture} onArchitectureResize={(event,selection,mode)=>beginArchitecture(event,selection,mode)} onArchitecturePointerMove={move} onArchitecturePointerUp={end}/><mesh rotation={[-Math.PI/2,0,0]} position={[0,.029,0]} onClick={e=>{e.stopPropagation();if(!drag&&!architectureDrag)p.onSelect(null);}}><planeGeometry args={[p.layout.width,p.layout.depth]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    {p.layout.items.map(item=>{const i=draft?.id===item.id?{...item,x:draft.x,z:draft.z}:item,selected=p.selected===i.id&&!p.preview;return <group key={i.id} position={[i.x,i.kind==='rug'?.024:.045,i.z]} rotation={[0,i.rotation*Math.PI/180,0]} onPointerDown={e=>begin(e,i)} onPointerMove={move} onPointerUp={end} onPointerCancel={end}><Furniture item={i}/>{(selected||p.preview)&&<Line points={[[-i.width/2,.025,-i.depth/2],[i.width/2,.025,-i.depth/2],[i.width/2,.025,i.depth/2],[-i.width/2,.025,i.depth/2],[-i.width/2,.025,-i.depth/2]]} color={p.preview?'#bd925b':'#51c4b6'} lineWidth={2.5}/>} {selected&&<mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[i.width+.04,i.depth+.04]}/><meshBasicMaterial color="#49c6b7" transparent opacity={.12} depthWrite={false}/></mesh>}</group>;})}
    <OrbitControls ref={controls} makeDefault enabled={!drag} enableRotate={!top} enablePan minPolarAngle={.1} maxPolarAngle={Math.PI/2.15} minZoom={25} maxZoom={220} enableDamping dampingFactor={.12}/>
  </>;
}
export default function Room(props:Props){return <Canvas className={props.canvasClassName} shadows dpr={[1,2]} gl={{antialias:true,preserveDrawingBuffer:true,toneMapping:THREE.ACESFilmicToneMapping}} onPointerMissed={()=>props.onSelect(null)}><OrthographicCamera makeDefault position={[7.3,10.5,12.8]} near={.1} far={200} zoom={80}/><Suspense fallback={null}><Scene {...props}/></Suspense></Canvas>;}
export function Thumbnail({kind}:{kind:Kind}){const i:Item={...catalog[kind],id:'thumbnail',kind,x:0,z:0,rotation:0,locked:false};return <Canvas frameloop="demand" dpr={1} gl={{alpha:true,antialias:true}} camera={{position:[2.8,2.0,3.2],fov:32}} style={{pointerEvents:'none'}}><ambientLight intensity={1.8}/><directionalLight position={[-2,4,3]} intensity={2.5}/><group position={[0,-.44,0]} scale={kind==='bed'?.8:kind==='rug'?.85:kind==='shelf'?.8:1}><Furniture item={i} decor={false}/></group></Canvas>;}
