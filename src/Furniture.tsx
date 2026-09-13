import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Item } from '../shared/layout';

// Every asset is made from local geometry. Textures are generated in memory.
let woodMap:THREE.CanvasTexture|undefined, fabricMap:THREE.CanvasTexture|undefined;
function surface(fabric=false){
  if(fabric&&fabricMap)return fabricMap;if(!fabric&&woodMap)return woodMap;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const c=canvas.getContext('2d')!;c.fillStyle=fabric?'#e9e5dc':'#e0c19a';c.fillRect(0,0,512,512);
  let seed=47;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  if(fabric){
    for(let i=0;i<512;i+=3){c.strokeStyle=i%2?'#cec7b9':'#faf7ef';c.globalAlpha=.5;c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.stroke();c.globalAlpha=.3;c.beginPath();c.moveTo(0,i);c.lineTo(512,i);c.stroke();}
  }else for(let i=0;i<350;i++){
    const y=rand()*512;c.strokeStyle=rand()>.5?'#8e6541':'#fff2d7';c.globalAlpha=.04+rand()*.16;c.lineWidth=.4+rand()*1.6;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(160,y+rand()*8,350,y-rand()*8,512,y+rand()*3);c.stroke();
  }
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  if(fabric){t.repeat.set(3,3);fabricMap=t;}else woodMap=t;return t;
}
type V=[number,number,number];
export function Box({p=[0,0,0],s=[1,1,1],color='#c3a178',wood=false,fabric=false,r=.015,rotation=[0,0,0],opacity=1,transparent=false}:{p?:V;s?:V;color?:string;wood?:boolean;fabric?:boolean;r?:number;rotation?:V;opacity?:number;transparent?:boolean}){
  const map=useMemo(()=>wood||fabric?surface(fabric):null,[wood,fabric]);
  return <RoundedBox position={p} args={s} radius={Math.min(r,...s.map(v=>v/3))} smoothness={2} rotation={rotation} castShadow receiveShadow><meshStandardMaterial color={color} map={map} roughness={fabric?.96:.72} side={THREE.DoubleSide} transparent={transparent} opacity={opacity} depthWrite={!transparent}/></RoundedBox>;
}
function Cylinder({p,s,color='#b79770'}:{p:V;s:V;color?:string}){return <mesh position={p} scale={s} castShadow receiveShadow><cylinderGeometry args={[1,.88,1,32]}/><meshStandardMaterial color={color} roughness={.8}/></mesh>;}
export function Plant({position=[0,0,0],scale=1}:{position?:V;scale?:number}){
  return <group position={position} scale={scale}>
    <Cylinder p={[0,.18,0]} s={[.15,.32,.15]} color="#b5a48b"/><Cylinder p={[0,.345,0]} s={[.132,.015,.132]} color="#514333"/>
    {Array.from({length:12},(_,i)=>{const a=i*2.4,y=.38+(i%4)*.1;return <group key={i} position={[0,y,0]} rotation={[.25,a,.25]}>
      <mesh position={[.065,.10,0]} rotation={[0,0,-.55]} castShadow><cylinderGeometry args={[.006,.009,.28,6]}/><meshStandardMaterial color="#55633e"/></mesh>
      <mesh position={[.12,.19,0]} rotation={[.4,0,-.7]} scale={[.07,.16,.018]} castShadow><sphereGeometry args={[1,10,8]}/><meshStandardMaterial color={['#66764b','#435b35','#7b8753'][i%3]} roughness={.85}/></mesh>
    </group>;})}
  </group>;
}
function Legs({height=.85,inset=.42,color='#49483d',wood=false}:{height?:number;inset?:number;color?:string;wood?:boolean}){
  return <>{[-1,1].flatMap(x=>[-1,1].map(z=><Box key={`${x}${z}`} p={[x*inset,height/2,z*inset]} s={[.045,height,.045]} color={color} wood={wood}/>))}</>;
}
function Books({p=[0,0,0]}:{p?:V}){return <group position={p}>{[0,1,2,3].map((i)=><Box key={i} p={[i*.07,.105,0]} s={[.055,.19+(i%2)*.04,.25]} color={['#8d856d','#dbcfb3','#596b66','#b08a66'][i]} r={.003}/>)}</group>;}
export function Furniture({item,decor=true}:{item:Item;decor?:boolean}){
  const {kind,color,width,depth,height}=item;
  const wood='#dcc5a5';
  return <group scale={[width,height,depth]}>
    {kind==='bed'&&<>
      <Legs height={.23} color={wood} wood/>
      <Box p={[0,.28,0]} s={[1,.18,1]} color={wood} wood/>
      <Box p={[0,.56,-.475]} s={[1,.88,.055]} color={wood} wood/>
      <Box p={[0,.74,-.46]} s={[.89,.12,.055]} color="#bfa079" wood/>
      <Box p={[0,.44,0]} s={[.96,.2,.94]} color="#efe9da" fabric r={.06}/>
      <Box p={[0,.55,.13]} s={[.98,.10,.63]} color={color} fabric r={.04}/>
      <Box p={[0,.606,-.08]} s={[.985,.035,.12]} color={color} fabric r={.02}/>
      {Array.from({length:7},(_,i)=><Box key={i} p={[-.42+i*.14,.607,.27]} s={[.006,.004,.3]} color={color} fabric r={.001}/>)}
      <Box p={[0,.58,-.32]} s={[.77,.19,.23]} color={color} fabric r={.065} rotation={[-.12,0,0]}/>
      <Box p={[0,.68,-.26]} s={[.44,.10,.13]} color="#ddd2b8" fabric r={.04}/>
      <Box p={[0,.29,.505]} s={[.85,.12,.017]} color={wood} wood/><Box p={[0,.31,.52]} s={[.14,.015,.015]} color="#635440"/>
    </>}
    {kind==='desk'&&<>
      <Legs height={.94}/><Box p={[0,.96,0]} s={[1,.08,1]} wood color={color}/>
      <Box p={[0,.23,-.42]} s={[.86,.025,.035]} color="#474941"/>
      {decor&&<>
        <Box p={[.05,1.013,.07]} s={[.30,.012,.30]} color="#4c514b" r={.003}/>
        {Array.from({length:5},(_,i)=><Box key={i} p={[.05,1.021,-.04+i*.04]} s={[.25,.003,.008]} color="#898b7e" r={.001}/>)}
        <group position={[-.33,1,-.27]} scale={[.27,.42,.52]}><Plant/></group>
        <Box p={[.31,1.025,-.23]} s={[.17,.04,.23]} color="#e1d9c2"/>
        <Cylinder p={[.35,1.04,.25]} s={[.04,.08,.07]} color="#746e5c"/>
      </>}
    </>}
    {kind==='chair'&&<>
      <Legs height={.51} inset={.35} color="#45483f"/>
      <Box p={[0,.54,.02]} s={[.95,.12,.92]} color={color} fabric r={.07}/>
      <Box p={[0,.79,-.37]} s={[.91,.43,.15]} color={color} fabric r={.075} rotation={[-.09,0,0]}/>
    </>}
    {(kind==='sofa'||kind==='armchair')&&<>
      <Legs height={.16} inset={.40} wood color={wood}/>
      <Box p={[0,.33,0]} s={[.97,.35,.96]} color={color} fabric r={.05}/>
      <Box p={[0,.73,-.36]} s={[.98,.52,.23]} color={color} fabric r={.075}/>
      {[-1,1].map(x=><Box key={x} p={[x*.43,.55,.025]} s={[.14,.50,.93]} color={color} fabric r={.045}/>)}
      {(kind==='sofa'?[-.2,.2]:[0]).map(x=><group key={x}><Box p={[x,.54,.10]} s={[kind==='sofa'?.39:.69,.17,.66]} color={color} fabric r={.05}/><Box p={[x,.78,-.22]} s={[kind==='sofa'?.39:.69,.37,.17]} color={color} fabric r={.05}/></group>)}
    </>}
    {kind==='table'&&<>
      <Legs height={.87} inset={.29} wood color={color}/><Cylinder p={[0,.94,0]} s={[.5,.10,.5]} color={color}/>
      {decor&&<><Box p={[-.14,1.02,.02]} s={[.25,.055,.3]} color="#617065"/><Box p={[-.14,1.06,.02]} s={[.22,.025,.28]} color="#e6dcc4"/><group position={[.19,1,-.13]} scale={[.35,.58,.35]}><Plant/></group></>}
    </>}
    {(kind==='dresser'||kind==='nightstand')&&<>
      <Legs height={.13} wood color={wood}/><Box p={[0,.56,0]} s={[.97,.84,.95]} wood color={color}/>
      <Box p={[0,.98,0]} s={[1,.04,1]} wood color={color}/>
      {Array.from({length:kind==='dresser'?4:3},(_,i)=>{const n=kind==='dresser'?4:3,h=.77/n;return <group key={i}><Box p={[0,.19+h/2+i*h,.487]} s={[.87,h-.025,.025]} wood color={color}/><Box p={[0,.19+h/2+i*h,.51]} s={[.17,.015,.025]} color="#645b49"/></group>;})}
      {decor&&kind==='nightstand'&&<group position={[0,1,-.08]} scale={[.54,.57,.54]}><Plant/></group>}
    </>}
    {kind==='shelf'&&<>
      <Legs height={1} inset={.44} wood color={color}/>
      {[.08,.32,.57,.81].map((y,i)=><group key={y}><Box p={[0,y,0]} s={[1,.023,1]} wood color={color}/><group position={[-.31,y+.012,0]} scale={[1,1,1]}><Books/></group>{i%2===0&&<Box p={[.25,y+.09,0]} s={[.23,.15,.63]} color="#b9b69d" fabric/>}</group>)}
      {decor&&<group position={[0,.83,0]} scale={[.45,.23,.8]}><Plant/></group>}
    </>}
    {kind==='rug'&&<>
      <Box p={[0,.5,0]} s={[1,1,1]} color={color} fabric r={.004}/>
      {[-1,1].map(z=><Box key={z} p={[0,1.005,z*.47]} s={[.95,.025,.013]} color="#8e826d" fabric r={.001}/>)}
      {Array.from({length:30},(_,i)=>[-1,1].map(z=><Box key={`${i}${z}`} p={[-.48+i*.033,.5,z*.504]} s={[.004,.5,.013]} color={color} r={.001}/>))}
    </>}
    {kind==='plant'&&<group scale={[1.7,1.08,1.7]}><Plant/></group>}
  </group>;
}
