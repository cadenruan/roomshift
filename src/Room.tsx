import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Furniture, Plant } from './Furniture';
import { catalog, corners, doorZone, type Item, type Kind, type Layout } from '../shared/layout';

type Props={layout:Layout;selected:string|null;onSelect:(id:string|null)=>void;onMove:(id:string,x:number,z:number)=>void;onAdd:(kind:Kind,x:number,z:number)=>void;view:'2D'|'3D';zoom:number;reset:number;preview:boolean;showClearance:boolean};
function Art({position,rotation=0,variant=0}:{position:[number,number,number];rotation?:number;variant?:number}){
  return <group position={position} rotation={[0,rotation,0]}>
    <Box s={[.47,.63,.035]} color="#a1835e" wood/><Box p={[0,0,.023]} s={[.415,.575,.012]} color="#e8ddc6"/>
    <Box p={[0,-.03,.032]} s={[.34,.43,.01]} color={variant?'#abac93':'#c0a581'}/>
    <mesh position={[0,-.13,.044]}><shapeGeometry args={[new THREE.Shape([new THREE.Vector2(-.17,-.11),new THREE.Vector2(.17,-.11),new THREE.Vector2(.17,.08),new THREE.Vector2(.04,.17),new THREE.Vector2(-.07,.09),new THREE.Vector2(-.17,.13)])]}/><meshStandardMaterial color={variant?'#6f755e':'#475c59'}/></mesh>
  </group>;
}
function Architecture({layout,top,clearance}:{layout:Layout;top:boolean;clearance:boolean}){
  const {width:w,depth:d}=layout,wall=top?.10:2.65,door=doorZone(layout);
  const planks=useMemo(()=>{
    const result:{x:number;z:number;w:number;color:string}[]=[];
    const rows=Math.ceil(d/.19);
    for(let row=0;row<rows;row++){
      let x=-w/2,segment=0;
      while(x<w/2-.001){const length=Math.min(segment===0?.55+(row%3)*.36:1.24,w/2-x);result.push({x:x+length/2,z:-d/2+(row+.5)*d/rows,w:length,color:['#d7bb96','#d4b18b','#ddbf9a','#cfad83','#ddc3a0'][(row*3+segment*7)%5]});x+=length;segment++;}
    }return result;
  },[w,d]);
  return <group>
    <Box p={[0,-.13,0]} s={[w+.22,.24,d+.22]} color="#bdb6a7"/>
    {planks.map((p,i)=><Box key={i} p={[p.x,.006,p.z]} s={[p.w-.007,.025,d/Math.ceil(d/.19)-.006]} color={p.color} wood r={.001}/>)}
    <Box p={[-w/2-.055,wall/2,-.01]} s={[.11,wall,d+.1]} color="#d9d0bf"/>
    <Box p={[w/2+.055,.16,0]} s={[.11,.32,d+.1]} color="#d8d0c1"/>
    <Box p={[0,.065,d/2+.055]} s={[w+.2,.13,.11]} color="#d8d0c1"/>
    {top?<Box p={[0,.05,-d/2-.055]} s={[w+.2,.1,.11]} color="#d8d0c1"/>:<>
      <Box p={[-(w/2+1.0)/2,1.325,-d/2-.055]} s={[w/2-1,2.65,.11]} color="#d4c9b5"/>
      <Box p={[(w/2+1.0)/2,1.325,-d/2-.055]} s={[w/2-1,2.65,.11]} color="#d4c9b5"/>
      <Box p={[0,.53,-d/2-.055]} s={[2,1.06,.11]} color="#d4c9b5"/>
      <Box p={[0,2.51,-d/2-.055]} s={[2,.28,.11]} color="#d4c9b5"/>
      <Box p={[0,1.71,-d/2-.12]} s={[1.98,1.31,.035]} color="#dce0ca"/>
      {Array.from({length:18},(_,i)=><mesh key={i} position={[-.9+(i%6)*.35,1.2+Math.floor(i/6)*.4,-d/2-.085]} scale={[.24,.27,.006]}><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color={['#a4b185','#b7bd96','#d5d3b7'][i%3]}/></mesh>)}
      {[-1,0,1].map(x=><Box key={x} p={[x*.96,1.71,-d/2+.005]} s={[.045,1.32,.09]} color="#605f53"/>)}
      {[1.06,2.37].map(y=><Box key={y} p={[0,y,-d/2+.02]} s={[2.02,.055,.11]} color="#f2eee3"/>)}
      <Box p={[0,1.05,-d/2+.10]} s={[2.13,.065,.28]} color="#e9e4d8"/>
      <Box p={[0,2.35,-d/2+.10]} s={[2.09,.13,.12]} color="#eae3d4"/>
      <group position={[-.81,1.09,-d/2+.1]} scale={.42}><Plant/></group><group position={[.83,1.09,-d/2+.1]} scale={.32}><Plant/></group>
      <Art position={[-1.72,1.98,-d/2+.035]} variant={1}/><Art position={[1.67,1.93,-d/2+.035]}/>
      <Art position={[-w/2+.025,1.57,-.7]} rotation={Math.PI/2} variant={1}/>
      <Art position={[-w/2+.025,1.85,-1.33]} rotation={Math.PI/2}/>
      <Box p={[-w/2+.01,.065,0]} s={[.035,.13,d]} color="#e9e3d7"/>
      <Box p={[0,.065,-d/2+.008]} s={[w,.13,.025]} color="#e9e3d7"/>
      <group position={[-w/2+.72,0,d/2]}>
        {[-.52,.52].map(x=><Box key={x} p={[x,1.08,0]} s={[.11,2.16,.15]} color="#d8d0c0"/>)}
        <Box p={[0,2.13,0]} s={[1.15,.12,.15]} color="#ddd5c7"/>
        <Box p={[0,1.01,.008]} s={[.92,2.02,.05]} wood color="#bd9d73"/>
        <Box p={[.34,1.01,.05]} s={[.04,.12,.035]} color="#514b3c"/><Box p={[.29,1.04,.08]} s={[.14,.027,.036]} color="#514b3c"/>
      </group>
    </>}
    {(clearance||top)&&<>
      <mesh rotation={[-Math.PI/2,0,0]} position={[door.x,.03,door.z]}><planeGeometry args={[door.width,door.depth]}/><meshBasicMaterial color="#d3a365" transparent opacity={.13} depthWrite={false}/></mesh>
      <Line points={Array.from({length:33},(_,i)=>{const a=i/32*Math.PI/2;return [-w/2+.2+Math.sin(a)*1.02,.04,d/2-Math.cos(a)*1.02] as [number,number,number];})} color="#b89d79" dashed dashSize={.06} gapSize={.04} lineWidth={1}/>
    </>}
    {top&&<><Html position={[0,.1,d/2+.3]} center><span className="measure">{w.toFixed(1)} m</span></Html><Html position={[-w/2-.35,.1,0]} center><span className="measure">{d.toFixed(1)} m</span></Html><Html position={[0,.1,-d/2-.25]} center><span className="measure">FIXED WINDOW</span></Html></>}
  </group>;
}
function Scene(p:Props){
  const {camera,gl,size}=useThree();const controls=useRef<any>(null);
  const [drag,setDrag]=useState<{id:string;offset:THREE.Vector3;start:THREE.Vector3;current:THREE.Vector3}|null>(null);
  const [draft,setDraft]=useState<{id:string;x:number;z:number}|null>(null);
  const plane=useMemo(()=>new THREE.Plane(new THREE.Vector3(0,1,0),0),[]);
  const top=p.view==='2D';
  useEffect(()=>{
    camera.position.set(...(top?[0,12,.001]:[7.3,10.5,12.8]) as [number,number,number]);camera.lookAt(0,0,0);
    if(controls.current){controls.current.target.set(0,top?0:.55,0);controls.current.update();}
  },[camera,top,p.reset]);
  useEffect(()=>{const cam=camera as THREE.OrthographicCamera;cam.zoom=Math.min(size.width/(p.layout.width+2.25),size.height/(p.layout.depth+2.25))*p.zoom;cam.updateProjectionMatrix();},[camera,size,p.zoom,p.layout.width,p.layout.depth,top]);
  useEffect(()=>{
    const drop=(event:DragEvent)=>{
      event.preventDefault();const kind=event.dataTransfer?.getData('application/roomshift') as Kind;if(!kind||!(kind in catalog)||p.preview)return;
      const bounds=gl.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1),camera);
      const hit=new THREE.Vector3();if(ray.ray.intersectPlane(plane,hit))p.onAdd(kind,hit.x,hit.z);
    };
    const over=(e:DragEvent)=>{e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy';};
    gl.domElement.addEventListener('drop',drop);gl.domElement.addEventListener('dragover',over);
    return ()=>{gl.domElement.removeEventListener('drop',drop);gl.domElement.removeEventListener('dragover',over);};
  },[camera,gl,plane,p.onAdd,p.preview]);
  const begin=(e:ThreeEvent<PointerEvent>,item:Item)=>{
    if(p.preview)return;e.stopPropagation();p.onSelect(item.id);
    if(item.locked||e.button!==0)return;
    const hit=new THREE.Vector3();if(!e.ray.intersectPlane(plane,hit))return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({id:item.id,offset:new THREE.Vector3(item.x,0,item.z).sub(hit),start:hit.clone(),current:new THREE.Vector3(item.x,0,item.z)});
    if(controls.current)controls.current.enabled=false;gl.domElement.style.cursor='grabbing';
  };
  const move=(e:ThreeEvent<PointerEvent>)=>{
    if(!drag)return;e.stopPropagation();const hit=new THREE.Vector3();if(!e.ray.intersectPlane(plane,hit))return;
    hit.add(drag.offset);drag.current.set(Math.round(hit.x*20)/20,0,Math.round(hit.z*20)/20);setDraft({id:drag.id,x:drag.current.x,z:drag.current.z});
  };
  const end=(e:ThreeEvent<PointerEvent>)=>{
    if(!drag)return;e.stopPropagation();(e.target as Element).releasePointerCapture(e.pointerId);
    p.onMove(drag.id,drag.current.x,drag.current.z);setDrag(null);setDraft(null);if(controls.current)controls.current.enabled=true;gl.domElement.style.cursor='grab';
  };
  return <>
    <color attach="background" args={['#f4f1e9']}/><ambientLight intensity={.9}/><hemisphereLight args={['#fff9ed','#a79b83',1.5]}/>
    <directionalLight position={[-3,9,3]} intensity={2.6} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-normalBias={.025} shadow-bias={-.0002} shadow-radius={4}/>
    <directionalLight position={[3,5,-4]} intensity={1.2} color="#fff4d8"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.265,0]} receiveShadow><planeGeometry args={[200,200]}/><shadowMaterial transparent opacity={.14}/></mesh>
    <Architecture layout={p.layout} top={top} clearance={p.showClearance}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.029,0]} onClick={e=>{e.stopPropagation();if(!drag)p.onSelect(null);}}><planeGeometry args={[p.layout.width,p.layout.depth]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    {p.layout.items.map(item=>{
      const i=draft?.id===item.id?{...item,x:draft.x,z:draft.z}:item;
      const selected=p.selected===i.id&&!p.preview;
      return <group key={i.id} position={[i.x,i.kind==='rug'?.024:.045,i.z]} rotation={[0,i.rotation*Math.PI/180,0]} onPointerDown={e=>begin(e,i)} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
        <Furniture item={i}/>
        {(selected||p.preview)&&<Line points={[[-i.width/2,.025,-i.depth/2],[i.width/2,.025,-i.depth/2],[i.width/2,.025,i.depth/2],[-i.width/2,.025,i.depth/2],[-i.width/2,.025,-i.depth/2]]} color={p.preview?'#bd925b':'#51c4b6'} lineWidth={2.5}/>} 
        {selected&&<mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[i.width+.04,i.depth+.04]}/><meshBasicMaterial color="#49c6b7" transparent opacity={.12} depthWrite={false}/></mesh>}
      </group>;
    })}
    <OrbitControls ref={controls} makeDefault enabled={!drag} enableRotate={!top} enablePan minPolarAngle={.1} maxPolarAngle={Math.PI/2.15} minZoom={25} maxZoom={220} enableDamping dampingFactor={.12}/>
  </>;
}
export default function Room(props:Props){return <Canvas shadows dpr={[1,2]} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping}} onPointerMissed={()=>props.onSelect(null)}><OrthographicCamera makeDefault position={[7.3,10.5,12.8]} near={.1} far={200} zoom={80}/><Suspense fallback={null}><Scene {...props}/></Suspense></Canvas>;}
export function Thumbnail({kind}:{kind:Kind}){
  const i:Item={...catalog[kind],id:'thumbnail',kind,x:0,z:0,rotation:0,locked:false};
  return <Canvas frameloop="demand" dpr={1} gl={{alpha:true,antialias:true}} camera={{position:[2.8,2.0,3.2],fov:32}} style={{pointerEvents:'none'}}><ambientLight intensity={1.8}/><directionalLight position={[-2,4,3]} intensity={2.5}/><group position={[0,-.44,0]} scale={kind==='bed'?.8:kind==='rug'?.85:kind==='shelf'?.8:1}><Furniture item={i} decor={false}/></group></Canvas>;
}
