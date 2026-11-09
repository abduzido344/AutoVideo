import React, {useMemo} from 'react';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type V = [number, number, number];
export type Expressao = 'deboa' | 'sera' | 'deuruim';
export type RemendoProps = {tempo?: number; expressao?: Expressao; giro?: number; acenar?: boolean; pressionar?:number};
const C = {pele:'#AA91B0', borracha:'#303033', camisa:'#252527', shorts:'#BC612D', sola:'#C8BBA5', tenis:'#E6DDC8', cabelo:'#BEDB35', olho:'#F1E6CA', preto:'#201E25'};
const clothTexture = (()=>{
 const data=new Uint8Array(128*128*4);
 for(let y=0;y<128;y++) for(let x=0;x<128;x++) {
  const n=125+25*Math.sin(x*91.7+y*37.3)+15*((x+y)%2);
  const i=(y*128+x)*4; data[i]=data[i+1]=data[i+2]=n;data[i+3]=255;
 }
 const texture=new T.DataTexture(data,128,128);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(4,4);texture.needsUpdate=true;return texture;
})();
const Fabric: React.FC<{color:string}> = ({color})=><meshStandardMaterial color={color} roughness={0.94} bumpMap={clothTexture} bumpScale={0.0015} side={T.DoubleSide}/>;
const drape = (profile:[number,number][], depth:number, strength:number) => {
 const curve=new T.SplineCurve(profile.map(p=>new T.Vector2(...p)));
 const geo=new T.LatheGeometry(curve.getPoints(48),64);
 const pos=geo.attributes.position;
 for(let i=0;i<pos.count;i++) {
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),a=Math.atan2(z,x);
  const fold=1+strength*(Math.sin(a*7+y*9)+0.4*Math.sin(a*13-y*16));
  pos.setXYZ(i,x*fold+0.012*Math.sin(y*9),y+0.007*Math.sin(a*3),z*depth*fold);
 }
 geo.computeVertexNormals();return geo;
};

const Box: React.FC<{size:V; pos?:V; rot?:V; color:string; radius?:number}> = ({size,pos,rot,color,radius=0.035}) => {
  const geo = useMemo(()=>new RoundedBoxGeometry(...size,4,radius),[...size,radius]);
  return <mesh geometry={geo} position={pos} rotation={rot} castShadow receiveShadow><meshStandardMaterial color={color} roughness={0.78}/></mesh>;
};
const Ball: React.FC<{pos?:V; scale:V; color:string}> = ({pos,scale,color}) => <mesh position={pos} scale={scale} castShadow><sphereGeometry args={[1,32,24]}/><meshStandardMaterial color={color} roughness={0.72}/></mesh>;
const Line: React.FC<{points:V[]; radius?:number; color:string}> = ({points,radius=0.008,color}) => {
  const geo=useMemo(()=>new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,radius,8,false),[JSON.stringify(points),radius]);
  return <mesh geometry={geo} castShadow><meshStandardMaterial color={color} roughness={0.8}/></mesh>;
};
const Limb: React.FC<{length:number; radius?:number}> = ({length,radius=0.025}) => <mesh position={[0,-length/2,0]} castShadow><capsuleGeometry args={[radius,length-radius*2,6,16]}/><meshStandardMaterial color={C.borracha} roughness={0.83}/></mesh>;
const Shirt = () => {
 const geo=useMemo(()=>drape([[0.23,-0.045],[0.24,-0.015],[0.22,0.06],[0.183,0.24],[0.18,0.37],[0.17,0.43],[0.13,0.47],[0.08,0.475]],0.65,0.035),[]);
 return <group>
  <mesh geometry={geo} rotation={[0,0,-0.045]} castShadow receiveShadow><Fabric color={C.camisa}/></mesh>
  <mesh position={[0,0.48,0]} rotation={[Math.PI/2,0,0]} scale={[1,0.65,1]}><torusGeometry args={[0.087,0.012,8,32]}/><meshStandardMaterial color="#424145" roughness={0.9}/></mesh>
  <Line points={[[-0.17,-0.035,0.105],[-0.06,-0.055,0.15],[0.09,-0.033,0.145],[0.21,0.005,0.08]]} radius={0.006} color="#3A383B"/>
 </group>;
};

const Shoe = () => <group>
  <Box size={[0.215,0.065,0.415]} pos={[0,0.042,0.09]} color={C.sola} radius={0.03}/>
  <Ball scale={[0.103,0.08,0.196]} pos={[0,0.107,0.09]} color={C.tenis}/>
  <Box size={[0.167,0.195,0.19]} pos={[0,0.18,-0.005]} color={C.tenis} radius={0.07}/>
  <Box size={[0.09,0.17,0.045]} pos={[0,0.2,0.09]} rot={[-0.18,0,0]} color="#DBD0BD" radius={0.02}/>
  {[0,1,2,3].map(i=><Line key={i} points={[[-0.055,0.16+i*0.019,0.119-i*0.008],[0,0.168+i*0.019,0.129-i*0.008],[0.055,0.16+i*0.019,0.119-i*0.008]]} radius={0.008} color="#F4EDDF"/>)}
  <Line points={[[-0.088,0.08,0.2],[-0.095,0.08,0.07],[-0.082,0.09,-0.05]]} radius={0.012} color="#77736A"/>
  <Line points={[[0,0.22,0.13],[-0.04,0.24,0.15],[-0.045,0.205,0.155],[0,0.22,0.13],[0.04,0.245,0.14],[0.047,0.208,0.145],[0,0.22,0.13]]} radius={0.007} color="#F4EDDF"/>
</group>;

const Hand: React.FC<{s:number}> = ({s}) => <group>
  <Ball scale={[0.05,0.065,0.026]} pos={[0,-0.04,0]} color={C.borracha}/>
  {[-1,0,1,2].map((n)=><Line key={n} points={[[n*0.023-0.011,-0.067,0],[n*0.028-0.011,-0.104,0.006],[n*0.029-0.011,-0.13+Math.abs(n-0.5)*0.01,0.021]]} radius={0.013} color={C.borracha}/>)}
  <Line points={[[s*0.035,-0.02,0],[s*0.067,-0.048,0.01],[s*0.07,-0.077,0.02]]} radius={0.015} color={C.borracha}/>
</group>;

const Tuft: React.FC<{points:V[]; radius:number}> = ({points,radius}) => {
  const geo=useMemo(()=>{
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const tube=new T.TubeGeometry(curve,32,radius,20,false),p=tube.attributes.position;
    for(let i=0;i<p.count;i++) {
      const t=Math.floor(i/21)/32, center=curve.getPointAt(t), v=new T.Vector3().fromBufferAttribute(p,i);
      v.sub(center).multiplyScalar(Math.max(0.005,Math.pow(1-t,0.7))).add(center);p.setXYZ(i,v.x,v.y,v.z);
    }
    tube.computeVertexNormals();return tube;
  },[]);
  return <mesh geometry={geo} castShadow><meshStandardMaterial color={C.cabelo} roughness={0.6}/></mesh>;
};
const Hair = () => <group>
 <Ball scale={[0.16,0.045,0.105]} pos={[0.01,0.26,0.015]} color={C.cabelo}/>
 <Tuft points={[[0.09,0.27,0.04],[0.02,0.36,0.08],[-0.12,0.39,0.1],[-0.25,0.33,0.11]]} radius={0.085}/>
 <Tuft points={[[0.08,0.27,-0.045],[0.02,0.38,-0.03],[-0.08,0.46,0],[-0.17,0.47,0.015]]} radius={0.075}/>
 <Tuft points={[[0.15,0.25,-0.04],[0.15,0.34,-0.03],[0.1,0.4,-0.02],[0.03,0.42,0]]} radius={0.063}/>
 </group>;
const ShortsLeg = () => {
 const geo=useMemo(()=>drape([[0.115,-0.28],[0.12,-0.255],[0.12,-0.18],[0.11,-0.06],[0.11,0.045]],1.05,0.025),[]);
 return <group><mesh geometry={geo} castShadow><Fabric color={C.shorts}/></mesh>
 <mesh position={[0,-0.255,0]} rotation={[Math.PI/2,0,0]} scale={[1,1.05,1]}><torusGeometry args={[0.117,0.012,10,48]}/><Fabric color="#AE5529"/></mesh>
 </group>;
};

const Eye: React.FC<{x:number; y:number; sleepy:boolean; worried:boolean; blink:number; side:number}> = ({x,y,sleepy,worried,blink,side}) => {
  const r=side===1?0.083:0.074;
  const lid=useMemo(()=>{
    const sh=new T.Shape(); const h=sleepy?0.006:0.068;
    sh.moveTo(-r,h); sh.lineTo(r,h);
    for(let i=0;i<=20;i++){const a=i/20*Math.PI;sh.lineTo(Math.cos(a)*r,Math.sin(a)*r*1.2);}
    sh.closePath(); return new T.ShapeGeometry(sh);
  },[r,sleepy]);
  return <group position={[x,y,0.154]} scale={[1,Math.max(0.05,1-blink),1]}>
    <Ball scale={[r,r*1.12,0.022]} color={C.olho}/>
    <Ball scale={[0.022,0.029,0.008]} pos={[worried?-0.015:0.018,sleepy?-0.015:0,0.022]} color={C.preto}/>
    <Ball scale={[0.007,0.008,0.004]} pos={[worried?-0.022:0.011,0.01,0.03]} color="#FFFFFF"/>
    {sleepy&&<mesh geometry={lid} position={[0,0,0.031]}><meshStandardMaterial color={C.pele} side={T.DoubleSide} roughness={0.8}/></mesh>}
    {sleepy&&<Line points={[[-r,0.007,0.033],[0,0.004,0.034],[r,0.007,0.033]]} radius={0.004} color="#76607E"/>}
  </group>;
};

const Head: React.FC<{e:Expressao; blink:number}> = ({e,blink}) => {
  const scared=e==='deuruim', worried=e==='sera';
  return <group rotation={[0,0,scared?0.045:-0.06]}>
    <Box size={[0.46,0.55,0.32]} color={C.pele} radius={0.143}/>
    <Hair/>
    <group position={[0,0,0.018]}>
    <Eye x={-0.103} y={0.045} sleepy={e==='deboa'} worried={worried} blink={blink} side={1}/>
    <Eye x={0.093} y={0.064} sleepy={e==='deboa'} worried={worried} blink={blink} side={-1}/>
    {[-1,1].map(s=><Box key={s} size={[0.16,0.033,0.035]} pos={[s*0.103,scared?0.203:0.174,0.16]} rot={[0,0, worried?s*-0.3:scared?s*-0.22:s*0.14]} color={C.preto} radius={0.009}/>)}
    <mesh position={[0,-0.035,0.183]} rotation={[0.15,0,0.12]} castShadow><coneGeometry args={[0.026,0.09,4]}/><meshStandardMaterial color="#947B9D" roughness={0.8}/></mesh>
    {scared?<group position={[0,-0.15,0.155]}><Ball scale={[0.067,0.075,0.012]} color="#30212F"/><Ball scale={[0.039,0.019,0.007]} pos={[0,-0.043,0.011]} color="#C97F8C"/></group>:
      <Line points={worried?[[-0.08,-0.16,0.154],[0,-0.126,0.16],[0.08,-0.16,0.154]]:[[-0.08,-0.15,0.155],[0,-0.165,0.16],[0.09,-0.115,0.154]]} radius={0.008} color={C.preto}/>}
    <Line points={[[0.171,-0.06,0.15],[0.164,-0.12,0.15],[0.155,-0.19,0.14]]} radius={0.005} color={C.preto}/>
    {[0,1,2,3].map(i=><Line key={i} points={[[0.144-i*0.003,-0.074-i*0.031,0.151],[0.18-i*0.004,-0.063-i*0.031,0.15]]} radius={0.005} color={C.preto}/>)}
    </group>
  </group>;
};

export const Remendo: React.FC<RemendoProps> = ({tempo=0,expressao='deboa',giro=0,acenar=false,pressionar}) => {
  const blinkPhase=tempo%3.3, blink=blinkPhase>3.1?Math.sin((blinkPhase-3.1)/0.2*Math.PI):0;
  const breath=Math.sin(tempo*2.2)*0.006;
  return <group rotation={[0,giro,0]}>
    {[-1,1].map(s=><group key={s} position={[s*0.135,1.1,0]} rotation={[0,0,s*0.04]}>
      <Limb length={0.45} radius={0.029}/>
      <group position={[0,-0.45,0]}><Ball scale={[0.029,0.029,0.029]} color={C.borracha}/><Limb length={0.43} radius={0.025}/><group position={[0,-0.65,0]} rotation={[0,s*0.08,0]} scale={[1.12,1,1.08]}><Shoe/></group></group>
      <ShortsLeg/>
    </group>)}
    <Box size={[0.4,0.1,0.245]} pos={[0,1.13,0]} color={C.shorts} radius={0.045}/>
    <group position={[0,1.16+breath,0]} rotation={[0,0,-0.035]}>
      <Shirt/>
      {[-1,1].map(s=><Line key={s} points={[[s*0.12,0.43,0],[s*0.22,0.43,0]]} radius={0.026} color={C.borracha}/>)}
      <mesh position={[0,0.49,0]} castShadow><cylinderGeometry args={[0.047,0.045,0.23,20]}/><meshStandardMaterial color={C.borracha} roughness={0.8}/></mesh>
      {[-1,1].map(s=><group key={s} position={[s*0.22,0.43,0]} rotation={[s===-1&&pressionar!==undefined?-1.08+pressionar*0.1:0,0,s===-1&&pressionar!==undefined?0:s*(s===-1&&acenar?0.8:0.1)]}>
        <Ball scale={[0.027,0.027,0.027]} color={C.borracha}/>
        <Limb length={0.34}/>
        <group position={[0,-0.34,0]} rotation={[s===-1&&pressionar!==undefined?-0.35:s===-1&&acenar?-0.3:-0.1,0,s===-1&&pressionar!==undefined?0:s===-1&&acenar?-1.65:-s*0.1]}>
          <Ball scale={[0.027,0.027,0.027]} color={C.borracha}/>
          <Limb length={0.34} radius={0.023}/>
          <group position={[0,-0.34,0]} rotation={[0,0,s===-1&&acenar?Math.sin(tempo*5)*0.18:0]}><Hand s={s}/></group>
        </group>
      </group>)}
      <group position={[0,0.87,0]} rotation={[0,Math.sin(tempo*1.1)*0.035,0]}><Head e={expressao} blink={blink}/></group>
    </group>
  </group>;
};
