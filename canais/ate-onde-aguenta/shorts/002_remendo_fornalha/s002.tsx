import React from 'react';
import * as T from 'three';
import {AbsoluteFill,Audio,Composition,registerRoot,staticFile,useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Remendo} from '../../remendo/Remendo';
import {Bicho} from '../../cobaia/Bichos';
import {Camara,Luz} from '../../cenarios/Camara';
import {Console} from '../../cenarios/fornalha';
import wordsJson from './s002_palavras.json';

const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const c=clamp(x);return c*c*(3-2*c);};
type V=[number,number,number];
type Shot={at:number;pos:V;target:V;fov:number};
const shots:Shot[]=[
 {at:0,pos:[0.7,2.4,7.3],target:[0,1.2,0.25],fov:43},
 {at:2,pos:[-0.55,2.35,3.7],target:[-0.9,1.8,0.5],fov:40},
 {at:4,pos:[0.8,1.75,3],target:[0.7,1.15,-0.7],fov:39},
 {at:6,pos:[-0.2,2.1,4.8],target:[-0.7,1.6,0.7],fov:40},
 {at:7.5,pos:[1.9,1.8,0.8],target:[1.55,1.5,-2.2],fov:36},
 {at:9.4,pos:[1.2,1.65,2.8],target:[0.7,1.12,-0.7],fov:38},
 {at:11.5,pos:[0.8,2.4,7],target:[0,1.2,0],fov:43},
 {at:13.7,pos:[-1.8,2.15,2.5],target:[-1.13,1.38,1.15],fov:38},
 {at:15.8,pos:[1.7,1.75,0.6],target:[1.55,1.5,-2.2],fov:36},
 {at:18,pos:[0.8,1.8,3.5],target:[0.7,1.15,-0.7],fov:40},
 {at:20,pos:[-0.3,2.25,3.4],target:[-0.9,1.95,0.5],fov:35},
 {at:21.3,pos:[1.1,1.65,1.6],target:[0.7,1.25,-0.7],fov:37},
 {at:23.2,pos:[1.8,1.45,1.6],target:[0.8,0.95,-0.7],fov:39},
 {at:25.3,pos:[0.75,2.5,1.7],target:[0.7,0.55,-0.7],fov:40},
 {at:27.5,pos:[0.7,2.1,2.8],target:[0.7,0.5,-0.7],fov:39},
 {at:29.5,pos:[-0.5,2.4,3.8],target:[-0.9,1.9,0.5],fov:40},
 {at:31.4,pos:[0.1,1.9,2.4],target:[-0.45,1.15,-1.15],fov:39},
 {at:33.5,pos:[0.6,2.4,6.6],target:[0,1.15,0],fov:43},
 {at:35.5,pos:[-0.5,2.25,3.7],target:[-0.9,1.92,0.5],fov:38},
 {at:37.5,pos:[-0.3,1.8,2.5],target:[-0.45,1.2,-1.15],fov:38},
 {at:39.5,pos:[0.2,1.65,2.1],target:[-0.45,1.1,-1.15],fov:36},
];
const Cam:React.FC<{t:number}> = ({t})=>{
 const {camera}=useThree();const s=[...shots].reverse().find(s=>s.at<=t)!;
 const elapsed=t-s.at, push=1-0.035*elapsed;
 camera.position.set(...s.pos); const target=new T.Vector3(...s.target);
 camera.position.sub(target).multiplyScalar(push).add(target);camera.lookAt(target);
 (camera as T.PerspectiveCamera).fov=s.fov;camera.updateProjectionMatrix();return null;
};
const captions=(()=>{
 const words=wordsJson as [string,number][];
 const out:{text:string;start:number;end:number}[]=[];
 for(let i=0;i<words.length;i+=4)out.push({text:words.slice(i,i+4).map(w=>w[0]).join(' '),start:words[i][1],end:words[i+4]?.[1]??40.82});
 return out;
})();

const Short:React.FC = ()=>{
 const f=useCurrentFrame(),t=f/30;
 const melt=smooth((t-21.3)/6.2), press=smooth((t-14.16)/0.2)*(1-smooth((t-15.3)/0.35));
 const temp=Math.round(-20+20*smooth((t-16.17)/1.52));
 const caption=captions.find(c=>t>=c.start&&t<c.end);
 const iceClose=t>=18&&t<29.5;
 return <AbsoluteFill style={{background:'#29333D',fontFamily:'Arial',color:'white'}}>
  <Audio src={staticFile('audio/remendo-s002.wav')}/>
  <Audio src={staticFile('audio/remendo-s002-ambiente.wav')} volume={0.65}/>
  <ThreeCanvas width={1080} height={1920} shadows camera={{position:[0,2,7],fov:43,near:0.05,far:80}}>
   <color attach="background" args={['#29333D']}/><Cam t={t}/><Luz calor={t>13.7?0.15:0}/>
   <Camara calor={t>13.7?0.12:0} nivel={0.12+0.13*smooth((t-16.17)/1.52)}/>
   <mesh position={[0,1.6,0.05]}><planeGeometry args={[4.8,3.1]}/><meshStandardMaterial color="#BDEAFF" transparent opacity={0.055} roughness={0.2} depthWrite={false} side={T.DoubleSide}/></mesh>
   {[-1,1].map(s=><mesh key={s} position={[s*2.4,1.6,0.05]}><boxGeometry args={[0.045,3.2,0.06]}/><meshStandardMaterial color="#A6AFB7" metalness={0.5} roughness={0.4}/></mesh>)}
   <group position={[-0.9,0,0.5]}><Remendo tempo={t} pressionar={t<29.5?press:undefined} expressao={t>30?'sera':t>21.3?'deuruim':'deboa'}/></group>
   <group position={[-0.87,0.81,1.14]} scale={0.55}><Console botao={press}/></group>
   <group position={[0.7,0,-0.7]}>
    <mesh position={[0,0.2,0]} receiveShadow castShadow><cylinderGeometry args={[0.67,0.7,0.4,48]}/><meshStandardMaterial color="#565E66" roughness={0.65} metalness={0.3}/></mesh>
    <group position={[0,0.4,0]} rotation={[0,-0.06,0]}><Bicho nome="pinguim" derrete={melt}/></group>
    {t>21.3&&t<27.8&&Array.from({length:5},(_,i)=>{const phase=(t*0.8+i*0.21)%1;return <mesh key={i} position={[Math.sin(i*8)*0.34,0.4+0.5*(1-phase),0.2+Math.cos(i*4)*0.2]} scale={[0.015,0.028,0.015]}><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color="#B5E1FF" roughness={0.08}/></mesh>;})}
   </group>
   <group position={[-0.45,0.4,-1.15]} rotation={[0,0.1,0]}><Bicho nome="coelho"/></group>
   <mesh position={[-0.45,0.2,-1.15]} castShadow receiveShadow><cylinderGeometry args={[0.48,0.5,0.4,40]}/><meshStandardMaterial color="#565E66" roughness={0.65}/></mesh>
  </ThreeCanvas>
  <div style={{position:'absolute',top:95,left:65,right:65,fontSize:25,letterSpacing:5,fontWeight:700}}>ATE ONDE AGUENTA</div>
  <div style={{position:'absolute',top:145,left:65,right:65,fontSize:t<3?69:48,lineHeight:1.03,fontWeight:900,textShadow:'0 3px 15px #000'}}>{t<3?'QUEM DERRETE PRIMEIRO?':t<13.7?'REMENDO NO CONTROLE':t<29.5?'GELO NA FORNALHA':'O PROXIMO E CHOCOLATE'}</div>
  <div style={{position:'absolute',top:305,right:65,background:'#121A23E8',border:'2px solid #7FD3FF',borderRadius:20,padding:'15px 24px',fontWeight:800,fontSize:50,color:'#B5E4FF'}}>{temp} °C</div>
  {(t<7||t>29.52)&&<div style={{position:'absolute',top:305,left:65,background:'#121A23DD',borderRadius:18,padding:'16px 22px',fontWeight:700,fontSize:30}}>{t<29.52?'9 NO JOGO':'8 NO JOGO'}</div>}
  {t>=11.5&&t<13.7&&<div style={{position:'absolute',top:420,left:65,fontSize:38,fontWeight:800,color:'#B5E4FF'}}>FRIO DE CONGELADOR</div>}
  {iceClose&&<div style={{position:'absolute',bottom:470,left:65,color:'#B5E4FF',fontSize:29,letterSpacing:3}}>PINGUIM DE GELO</div>}
  <div style={{position:'absolute',bottom:245,left:65,right:65,textAlign:'center',fontSize:51,lineHeight:1.15,fontWeight:800,textShadow:'0 3px 8px black',background:caption?'#111820CF':'transparent',padding:18,borderRadius:18}}>{caption?.text}</div>
  <div style={{position:'absolute',bottom:125,left:65,fontSize:20,letterSpacing:2,color:'#C2CDD5'}}>SIMULACAO / TEMPO ACELERADO</div>
  {t>=40.82&&<AbsoluteFill style={{background:'#111820F5',justifyContent:'center',alignItems:'center',padding:75,textAlign:'center'}}><div style={{fontSize:35,color:'#BEDB35',letterSpacing:5}}>ATE ONDE AGUENTA</div><div style={{fontSize:84,fontWeight:900,marginTop:40}}>E O COELHO?<br/>QUANTO AGUENTA?</div></AbsoluteFill>}
 </AbsoluteFill>;
};
registerRoot(()=> <Composition id="remendo-fornalha" component={Short} durationInFrames={1255} fps={30} width={1080} height={1920}/>);
