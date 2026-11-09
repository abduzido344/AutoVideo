import React from 'react';
import {AbsoluteFill,Composition,registerRoot,useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {Remendo,Expressao} from './Remendo';

const Scene: React.FC<{sheet?:boolean}> = ({sheet=false}) => {
 const frame=useCurrentFrame(),t=frame/30;
 const e:Expressao=frame<40?'deboa':frame<80?'sera':'deuruim';
 return <AbsoluteFill style={{background:'#DFDBD4',fontFamily:'Arial',color:'#302E32'}}>
  <ThreeCanvas width={1600} height={1100} shadows orthographic camera={{position:[0,0,9],zoom:sheet?240:340}}>
   <color attach="background" args={['#DFDBD4']}/>
   <hemisphereLight args={['#FFFFFF','#9B9490',1.5]}/>
   <directionalLight position={[-3,6,6]} intensity={2.4} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-bias={-0.0002}/>
   <directionalLight position={[4,4,-2]} intensity={2}/>
   <directionalLight position={[1,1,6]} intensity={0.5}/>
   <group position={[0,-1.35,0]}>
    {sheet?<>
      <group position={[-2.35,0,0]}><Remendo tempo={0.5} giro={0.38} acenar/></group>
      <group position={[-0.55,0,0]}><Remendo tempo={0.5} giro={Math.PI/2}/></group>
      {(['deboa','sera','deuruim'] as Expressao[]).map((ex,i)=><group key={ex} position={[1.08+i*0.82,0.25,0]} scale={0.63}><Remendo tempo={0.5} giro={-0.1} expressao={ex}/></group>)}
    </>:<Remendo tempo={t} expressao={e} acenar giro={0.25+Math.sin(t*0.8)*0.22}/>}
    <mesh position={[0,-0.012,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#DFDBD4" roughness={1}/></mesh>
   </group>
  </ThreeCanvas>
  <div style={{position:'absolute',top:42,left:65}}><div style={{fontSize:16,letterSpacing:5}}>ATE ONDE AGUENTA / PERSONAGEM ORIGINAL</div><div style={{fontSize:54,fontWeight:800,marginTop:10}}>REMENDO <span style={{fontSize:20,fontWeight:400}}>MODELO 3D / V02</span></div></div>
  {sheet&&<div style={{position:'absolute',bottom:140,left:0,right:0,display:'flex',justifyContent:'space-around',fontSize:17,letterSpacing:2}}><span>FRENTE / ATITUDE</span><span>PERFIL</span><span>DE BOA / SERA? / DEU RUIM</span></div>}
  <div style={{position:'absolute',bottom:42,left:65,fontSize:15,letterSpacing:2}}>THREE.JS / GEOMETRIA ORIGINAL / POSES E EXPRESSOES CONTROLAVEIS</div>
 </AbsoluteFill>;
};
registerRoot(()=> <><Composition id="remendo-ficha" component={()=> <Scene sheet/>} durationInFrames={1} fps={30} width={1600} height={1100}/><Composition id="remendo-teste" component={Scene} durationInFrames={120} fps={30} width={1600} height={1100}/></>);
