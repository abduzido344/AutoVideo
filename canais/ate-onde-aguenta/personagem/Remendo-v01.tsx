import React, {useMemo} from 'react';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

type V = [number, number, number];
export type Expressao = 'deboa' | 'sera' | 'deuruim';
export type RemendoProps = {tempo?: number; expressao?: Expressao; giro?: number; acenar?: boolean};
const C = {pele:'#AA91B0', borracha:'#303033', camisa:'#252527', shorts:'#BC612D', sola:'#C8BBA5', tenis:'#E6DDC8', cabelo:'#BEDB35', olho:'#F1E6CA', preto:'#201E25'};

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
 const geo=useMemo(()=>new T.LatheGeometry([[0.215,0],[0.22,0.025],[0.205,0.08],[0.18,0.25],[0.175,0.4],[0.16,0.46],[0.09,0.48]].map(p=>new T.Vector2(...p as [number,number])),48),[]);
 return <group>
  <mesh geometry={geo} scale={[1,1,0.65]} castShadow receiveShadow><meshStandardMaterial color={C.camisa} roughness={0.95} side={T.DoubleSide}/></mesh>
  <mesh position={[0,0.48,0]} rotation={[Math.PI/2,0,0]} scale={[1,0.65,1]}><torusGeometry args={[0.087,0.012,8,32]}/><meshStandardMaterial color="#424145" roughness={0.9}/></mesh>
  {[-1,1].map(s=><Line key={s} points={[[s*0.14,0.08,0.11],[s*0.12,0.16,0.105],[s*0.145,0.3,0.08]]} radius={0.006} color="#333235"/>)}
 </group>;
};

const Shoe = () => <group>
  <Box size={[0.19,0.065,0.38]} pos={[0,0.042,0.08]} color={C.sola} radius={0.025}/>
  <Box size={[0.175,0.12,0.34]} pos={[0,0.105,0.08]} color={C.tenis} radius={0.045}/>
  <Box size={[0.14,0.17,0.16]} pos={[0,0.18,-0.005]} color={C.tenis}/>
  <Box size={[0.08,0.14,0.035]} pos={[0,0.19,0.085]} color="#DBD0BD" radius={0.014}/>
  {[0,1,2,3].map(i=><Line key={i} points={[[-0.055,0.16+i*0.019,0.119-i*0.008],[0,0.168+i*0.019,0.129-i*0.008],[0.055,0.16+i*0.019,0.119-i*0.008]]} radius={0.008} color="#F4EDDF"/>)}
  <Line points={[[-0.088,0.08,0.2],[-0.095,0.08,0.07],[-0.082,0.09,-0.05]]} radius={0.012} color="#77736A"/>
</group>;

const Hand: React.FC<{s:number}> = ({s}) => <group>
  <Ball scale={[0.05,0.065,0.026]} pos={[0,-0.04,0]} color={C.borracha}/>
  {[-1,0,1].map((n)=><group key={n} position={[n*0.027,-0.08,0]} rotation={[0,0,n*0.14]}><Limb length={0.065-Math.abs(n)*0.008} radius={0.012}/></group>)}
  <Line points={[[s*0.035,-0.02,0],[s*0.067,-0.048,0.01],[s*0.07,-0.077,0.02]]} radius={0.015} color={C.borracha}/>
</group>;

const Hair = () => {
  const geo=useMemo(()=>{
    const shape=new T.Shape();
    shape.moveTo(-0.19,0); shape.bezierCurveTo(-0.2,0.12,-0.28,0.12,-0.28,0.12);
    shape.quadraticCurveTo(-0.12,0.18,-0.035,0.105);
    shape.lineTo(-0.105,0.23); shape.quadraticCurveTo(0.045,0.2,0.1,0.085);
    shape.lineTo(0.075,0.17); shape.quadraticCurveTo(0.21,0.11,0.19,-0.035);
    shape.quadraticCurveTo(0,-0.08,-0.19,0);
    return new T.ExtrudeGeometry(shape,{depth:0.065,bevelEnabled:true,bevelSize:0.012,bevelThickness:0.012,bevelSegments:3,steps:1});
  },[]);
  return <mesh geometry={geo} position={[0,0.245,0.035]} castShadow><meshStandardMaterial color={C.cabelo} roughness={0.66}/></mesh>;
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
    <Box size={[0.43,0.56,0.29]} color={C.pele} radius={0.095}/>
    <Hair/>
    <Eye x={-0.103} y={0.045} sleepy={e==='deboa'} worried={worried} blink={blink} side={1}/>
    <Eye x={0.093} y={0.064} sleepy={e==='deboa'} worried={worried} blink={blink} side={-1}/>
    {[-1,1].map(s=><Box key={s} size={[0.16,0.033,0.035]} pos={[s*0.103,scared?0.203:0.174,0.16]} rot={[0,0, worried?s*-0.3:scared?s*-0.22:s*0.14]} color={C.preto} radius={0.009}/>)}
    <mesh position={[0,-0.035,0.178]} rotation={[0,0,0.12]} castShadow><coneGeometry args={[0.025,0.095,3]}/><meshStandardMaterial color="#947B9D" roughness={0.8}/></mesh>
    {scared?<group position={[0,-0.15,0.155]}><Ball scale={[0.067,0.075,0.012]} color="#30212F"/><Ball scale={[0.039,0.019,0.007]} pos={[0,-0.043,0.011]} color="#C97F8C"/></group>:
      <Line points={worried?[[-0.08,-0.16,0.154],[0,-0.126,0.16],[0.08,-0.16,0.154]]:[[-0.08,-0.15,0.155],[0,-0.165,0.16],[0.09,-0.115,0.154]]} radius={0.008} color={C.preto}/>}
    <Line points={[[0.171,-0.06,0.15],[0.164,-0.12,0.15],[0.155,-0.19,0.14]]} radius={0.005} color={C.preto}/>
    {[0,1,2,3].map(i=><Line key={i} points={[[0.144-i*0.003,-0.074-i*0.031,0.151],[0.18-i*0.004,-0.063-i*0.031,0.15]]} radius={0.005} color={C.preto}/>)}
  </group>;
};

export const Remendo: React.FC<RemendoProps> = ({tempo=0,expressao='deboa',giro=0,acenar=false}) => {
  const blinkPhase=tempo%3.3, blink=blinkPhase>3.1?Math.sin((blinkPhase-3.1)/0.2*Math.PI):0;
  const breath=Math.sin(tempo*2.2)*0.006;
  return <group rotation={[0,giro,0]}>
    {[-1,1].map(s=><group key={s} position={[s*0.115,1.1,0]} rotation={[0,0,s*0.025]}>
      <Limb length={0.45} radius={0.029}/>
      <group position={[0,-0.45,0]}><Ball scale={[0.029,0.029,0.029]} color={C.borracha}/><Limb length={0.43} radius={0.025}/><group position={[0,-0.65,0]} rotation={[0,s*0.08,0]} scale={[1.12,1,1.08]}><Shoe/></group></group>
      <Box size={[0.22,0.32,0.26]} pos={[0,-0.11,0]} color={C.shorts} radius={0.035}/>
      <Box size={[0.226,0.045,0.265]} pos={[0,-0.25,0]} color="#A95328" radius={0.014}/>
    </group>)}
    <Box size={[0.36,0.15,0.255]} pos={[0,1.095,0]} color={C.shorts}/>
    <group position={[0,1.16+breath,0]} rotation={[0,0,-0.035]}>
      <Shirt/>
      {[-1,1].map(s=><Line key={s} points={[[s*0.12,0.43,0],[s*0.22,0.43,0]]} radius={0.026} color={C.borracha}/>)}
      <mesh position={[0,0.49,0]} castShadow><cylinderGeometry args={[0.047,0.045,0.23,20]}/><meshStandardMaterial color={C.borracha} roughness={0.8}/></mesh>
      {[-1,1].map(s=><group key={s} position={[s*0.22,0.43,0]} rotation={[0,0,s*(s===-1&&acenar?0.8:0.1)]}>
        <Ball scale={[0.027,0.027,0.027]} color={C.borracha}/>
        <Limb length={0.34}/>
        <group position={[0,-0.34,0]} rotation={[s===-1&&acenar?-0.3:-0.1,0,s===-1&&acenar?-1.65:-s*0.1]}>
          <Ball scale={[0.027,0.027,0.027]} color={C.borracha}/>
          <Limb length={0.34} radius={0.023}/>
          <group position={[0,-0.34,0]} rotation={[0,0,s===-1&&acenar?Math.sin(tempo*5)*0.18:0]}><Hand s={s}/></group>
        </group>
      </group>)}
      <group position={[0,0.87,0]} rotation={[0,Math.sin(tempo*1.1)*0.035,0]}><Head e={expressao} blink={blink}/></group>
    </group>
  </group>;
};
