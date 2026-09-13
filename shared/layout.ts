import { z } from 'zod';

export const kinds = ['bed','desk','chair','sofa','armchair','table','dresser','shelf','nightstand','rug','plant'] as const;
export type Kind = typeof kinds[number];
export const walls = ['north','south','east','west'] as const;
export type Wall = typeof walls[number];
export const decorationKinds = ['painting','mirror','wall-shelf','wall-plant'] as const;
export type DecorationKind = typeof decorationKinds[number];

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const itemSchema = z.object({
  id:z.string().min(1).max(80), kind:z.enum(kinds), name:z.string().min(1).max(60),
  x:z.number().finite().min(-15).max(15), z:z.number().finite().min(-15).max(15),
  width:z.number().finite().min(.2).max(4), depth:z.number().finite().min(.2).max(4), height:z.number().finite().min(.02).max(2.6),
  rotation:z.number().finite().min(0).max(359), color:hexColor, locked:z.boolean()
}).strict();

export const doorSchema = z.object({
  wall:z.enum(walls), offset:z.number().finite().min(-15).max(15), width:z.number().finite().min(.6).max(2.4),
  clearance:z.number().finite().min(.6).max(2.4), swing:z.enum(['in','out'])
}).strict();
export const windowSchema = z.object({
  id:z.string().min(1).max(80), wall:z.enum(walls), offset:z.number().finite().min(-15).max(15),
  width:z.number().finite().min(.4).max(4), sill:z.number().finite().min(.3).max(2.4),
  height:z.number().finite().min(.3).max(2.5), clearance:z.number().finite().min(.1).max(1.2)
}).strict();
export const decorationSchema = z.object({
  id:z.string().min(1).max(80), kind:z.enum(decorationKinds), wall:z.enum(walls), offset:z.number().finite().min(-15).max(15),
  width:z.number().finite().min(.2).max(3), height:z.number().finite().min(.2).max(2.5), color:hexColor
}).strict();

export type Item = z.infer<typeof itemSchema>;
export type DoorConfig = z.infer<typeof doorSchema>;
export type WindowConfig = z.infer<typeof windowSchema>;
export type DecorationConfig = z.infer<typeof decorationSchema>;

const defaultWindows:WindowConfig[] = [{id:'window-north',wall:'north',offset:0,width:1.8,sill:1.05,height:1.35,clearance:.45}];
const defaultDecorations:DecorationConfig[] = [
  {id:'painting-north-left',kind:'painting',wall:'north',offset:-1.72,width:.47,height:.63,color:'#6f755e'},
  {id:'painting-north-right',kind:'painting',wall:'north',offset:1.67,width:.47,height:.63,color:'#c0a581'},
  {id:'painting-west-upper',kind:'painting',wall:'west',offset:-.7,width:.47,height:.63,color:'#6f755e'},
  {id:'painting-west-lower',kind:'painting',wall:'west',offset:-1.33,width:.47,height:.63,color:'#c0a581'},
];
const defaultDoor=(width:number):DoorConfig=>({wall:'south',offset:-width/2+.72,width:1.12,clearance:1.12,swing:'in'});

export const layoutSchema = z.object({
  width:z.number().finite().min(3).max(10), depth:z.number().finite().min(3).max(10), items:z.array(itemSchema).max(60),
  door:doorSchema.default(defaultDoor(4.8)), windows:z.array(windowSchema).max(12).default(defaultWindows),
  decorations:z.array(decorationSchema).max(30).default(defaultDecorations)
}).strict().superRefine((l,ctx)=>{
  if(new Set(l.items.map(i=>i.id)).size!==l.items.length)ctx.addIssue({code:'custom',message:'Furniture IDs must be unique.'});
  if(new Set(l.windows.map(i=>i.id)).size!==l.windows.length)ctx.addIssue({code:'custom',message:'Window IDs must be unique.'});
  if(new Set(l.decorations.map(i=>i.id)).size!==l.decorations.length)ctx.addIssue({code:'custom',message:'Decoration IDs must be unique.'});
});
export type Layout = z.infer<typeof layoutSchema>;

/** Parse saved layouts from before architecture editing was introduced. */
export function normalizeLayout(value:unknown):Layout {
  const parsed=layoutSchema.parse(value);
  const raw=value as {door?:unknown;windows?:unknown;decorations?:unknown}|null;
  return {
    ...parsed,
    door:raw && raw.door ? parsed.door : defaultDoor(parsed.width),
    windows:raw && Array.isArray(raw.windows) ? parsed.windows : defaultWindows.map(w=>({...w})),
    decorations:raw && Array.isArray(raw.decorations) ? parsed.decorations : defaultDecorations.map(d=>({...d}))
  };
}

export const catalog:Record<Kind,{name:string;width:number;depth:number;height:number;color:string}> = {
  bed:{name:'Bed',width:1.05,depth:2.1,height:.95,color:'#7c8368'}, desk:{name:'Desk',width:1.2,depth:.58,height:.76,color:'#c5a073'},
  chair:{name:'Chair',width:.48,depth:.5,height:.84,color:'#747d67'}, sofa:{name:'Sofa',width:1.6,depth:.8,height:.82,color:'#b8b4a9'},
  armchair:{name:'Armchair',width:.78,depth:.8,height:.84,color:'#b97650'}, table:{name:'Table',width:.85,depth:.85,height:.48,color:'#bd9466'},
  dresser:{name:'Dresser',width:.9,depth:.45,height:.95,color:'#c6aa80'}, shelf:{name:'Shelf',width:.65,depth:.32,height:1.75,color:'#b99565'},
  nightstand:{name:'Nightstand',width:.46,depth:.42,height:.57,color:'#c4a070'}, rug:{name:'Rug',width:1.95,depth:2.45,height:.025,color:'#c3b395'},
  plant:{name:'Plant',width:.42,depth:.42,height:.8,color:'#617548'}
};
export function makeItem(kind:Kind,x=0,z=0):Item{return {id:crypto.randomUUID(),kind,...catalog[kind],x,z,rotation:0,locked:false};}
export function preset():Layout {
  const place=(id:string,kind:Kind,x:number,z:number,extra:Partial<Item>={}):Item=>({...makeItem(kind,x,z),id,...extra});
  return normalizeLayout({width:4.8,depth:5.8,door:defaultDoor(4.8),windows:defaultWindows,decorations:defaultDecorations,items:[
    place('bed-a','bed',-1.57,-1.55,{name:'Olive bed'}),place('bed-b','bed',1.43,-1.55,{name:'Indigo bed',color:'#617384'}),
    place('nightstand-a','nightstand',-.72,-2.03),place('shelf-a','shelf',2.16,-1.55,{width:.32,depth:.65}),
    place('desk-a','desk',-2.03,.35,{rotation:90}),place('chair-a','chair',-1.38,.35,{rotation:270}),
    place('desk-b','desk',2.04,1.28,{rotation:90}),place('chair-b','chair',1.38,1.28,{rotation:90,color:'#536571'}),
    place('rug-a','rug',0,.85),place('table-a','table',0,.55),place('plant-a','plant',-1.42,1.56),place('plant-b','plant',2.04,2.38)
  ]});
}
export type Point={x:number;z:number};
export function corners(i:Pick<Item,'x'|'z'|'width'|'depth'|'rotation'>):Point[]{
  const r=i.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>({x:i.x+a*i.width/2*c+b*i.depth/2*s,z:i.z-a*i.width/2*s+b*i.depth/2*c}));
}
export function intersects(a:Point[],b:Point[],gap=.008){
  for(const p of [a,b])for(let j=0;j<p.length;j++){
    const v=p[j],w=p[(j+1)%p.length],axis={x:-(w.z-v.z),z:w.x-v.x};
    const len=Math.hypot(axis.x,axis.z);axis.x/=len;axis.z/=len;
    const aa=a.map(t=>t.x*axis.x+t.z*axis.z),bb=b.map(t=>t.x*axis.x+t.z*axis.z);
    if(Math.max(...aa)<=Math.min(...bb)+gap||Math.max(...bb)<=Math.min(...aa)+gap)return false;
  }return true;
}
export function wallRect(l:Layout,wall:Wall,offset:number,span:number,depth:number){
  if(wall==='north')return {x:offset,z:-l.depth/2+depth/2,width:span,depth,rotation:0};
  if(wall==='south')return {x:offset,z:l.depth/2-depth/2,width:span,depth,rotation:0};
  if(wall==='east')return {x:l.width/2-depth/2,z:offset,width:depth,depth:span,rotation:0};
  return {x:-l.width/2+depth/2,z:offset,width:depth,depth:span,rotation:0};
}
export function doorZone(l:Layout){return wallRect(l,l.door.wall,l.door.offset,l.door.width,l.door.clearance);}
export function windowZone(l:Layout,w:WindowConfig){return wallRect(l,w.wall,w.offset,w.width,w.clearance);}
export function checks(l:Layout){
  const boundary:string[]=[],overlap:string[]=[],door:string[]=[],barrier:string[]=[];
  for(const i of l.items){
    if(corners(i).some(p=>Math.abs(p.x)>l.width/2+.001||Math.abs(p.z)>l.depth/2+.001))boundary.push(`${i.name} is outside the room`);
    if(i.kind!=='rug'&&intersects(corners(i),corners(doorZone(l))))door.push(`${i.name} blocks the door swing`);
    if(i.kind!=='rug')for(const w of l.windows)if(i.height>w.sill&&intersects(corners(i),corners(windowZone(l,w)))){barrier.push(`${i.name} blocks ${w.id}`);break;}
  }
  for(let a=0;a<l.items.length;a++)for(let b=a+1;b<l.items.length;b++){
    const i=l.items[a],j=l.items[b];if(i.kind==='rug'||j.kind==='rug')continue;
    if(intersects(corners(i),corners(j)))overlap.push(`${i.name} overlaps ${j.name}`);
  }
  return {boundary,overlap,door,barrier};
}
export function issues(l:Layout){return Object.values(checks(l)).flat();}
export function findSpace(l:Layout,item:Item):Item|null {
  for(let z=-l.depth/2+item.depth/2+.1;z<l.depth/2;z+=.2)for(let x=-l.width/2+item.width/2+.1;x<l.width/2;x+=.2){
    const candidate={...item,x:Math.round(x*100)/100,z:Math.round(z*100)/100},others=l.items.filter(i=>i.id!==item.id);
    if(corners(candidate).some(p=>Math.abs(p.x)>l.width/2||Math.abs(p.z)>l.depth/2))continue;
    if(candidate.kind!=='rug'&&(intersects(corners(candidate),corners(doorZone(l)))||others.some(i=>i.kind!=='rug'&&intersects(corners(candidate),corners(i)))))continue;
    if(candidate.kind!=='rug'&&l.windows.some(w=>candidate.height>w.sill&&intersects(corners(candidate),corners(windowZone(l,w)))))continue;
    return candidate;
  }return null;
}
export const proposalSchema=z.object({status:z.enum(['ok','impossible']),summary:z.string().min(1).max(1200),items:z.array(itemSchema).max(60)}).strict();
export type Proposal=z.infer<typeof proposalSchema>;
export function validateProposal(base:Layout,p:Proposal):string[]{
  if(p.status==='impossible')return [];
  const errors=issues({...base,items:p.items});
  if(new Set(p.items.map(i=>i.id)).size!==p.items.length)errors.push('Duplicate furniture IDs.');
  for(const i of base.items){
    const next=p.items.find(j=>j.id===i.id);
    if(!next)errors.push(`${i.name} was removed; rearrangement must preserve existing furniture.`);
    else if(i.locked&&JSON.stringify(next)!==JSON.stringify(i))errors.push(`${i.name} is locked.`);
    else if(next.kind!==i.kind)errors.push(`${i.name} cannot change furniture type.`);
  }
  return errors;
}
