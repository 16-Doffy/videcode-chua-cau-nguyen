import * as THREE from './vendor/three.module.min.js';
export const characters=[
 {id:'may',name:'Mây',role:'Người giữ bình yên',color:'#8cdaec',hair:'#24324a',skin:'#f2c6ad',accessory:'moon'},
 {id:'na',name:'Na',role:'Một chút nắng ấm',color:'#edb78c',hair:'#503c49',skin:'#e8af91',accessory:'flower'},
 {id:'miu',name:'Miu',role:'Bạn đồng hành tinh nghịch',color:'#c5a5f1',hair:'#302b50',skin:'#f4cbb8',accessory:'ears'},
 {id:'an',name:'An',role:'Chậm rãi mà vững vàng',color:'#a1d6b1',hair:'#333b34',skin:'#c58b6c',accessory:'hat'}
];
export function portrait(c){return `<svg viewBox="0 0 120 140" aria-hidden="true"><ellipse cx="60" cy="128" rx="31" ry="6" fill="${c.color}" opacity=".15"/><path d="M39 95q21-14 42 0l6 26H33Z" fill="${c.color}"/><path d="M39 102l-9 17m51-17 9 17" stroke="${c.color}" stroke-width="12" stroke-linecap="round"/><path d="M48 121v8m24-8v8" stroke="#29314b" stroke-width="12" stroke-linecap="round"/><ellipse cx="60" cy="62" rx="36" ry="37" fill="${c.hair}"/><ellipse cx="60" cy="70" rx="30" ry="29" fill="${c.skin}"/><path d="M30 57q2-38 32-33 30-2 30 38L70 46 55 60 45 48Z" fill="${c.hair}"/><ellipse cx="49" cy="72" rx="3.5" ry="5" fill="#172131"/><ellipse cx="72" cy="72" rx="3.5" ry="5" fill="#172131"/><circle cx="50" cy="70" r="1.3" fill="white"/><circle cx="73" cy="70" r="1.3" fill="white"/><ellipse cx="39" cy="82" rx="5" ry="2.5" fill="#dc8f96" opacity=".5"/><ellipse cx="82" cy="82" rx="5" ry="2.5" fill="#dc8f96" opacity=".5"/><path d="M56 85q4 4 8 0" fill="none" stroke="#9b6367" stroke-width="2" stroke-linecap="round"/>${c.accessory==='ears'?`<path d="M28 40 25 12 48 28M73 27 96 12 93 44" fill="${c.hair}" stroke="${c.color}" stroke-width="4"/>`:c.accessory==='flower'?'<g fill="#fbe0b1"><circle cx="85" cy="39" r="9"/><circle cx="88" cy="30" r="6"/><circle cx="95" cy="39" r="6"/><circle cx="85" cy="48" r="6"/></g><circle cx="85" cy="39" r="4" fill="#c994ba"/>':c.accessory==='hat'?`<path d="M25 38q35-43 70 0L60 45Z" fill="${c.color}" stroke="#d1ead4" stroke-width="2"/>`:'<path d="M85 28a11 11 0 1 0 10 15A10 10 0 0 1 85 28" fill="#c5f6ff"/>'}<path d="M55 103l5 6 5-6" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/></svg>`}
export function createCharacter(scene,{reduced,onState}){
 const root=new THREE.Group();scene.add(root);root.position.set(1,.18,9);root.scale.setScalar(1.5);
 let rig,selected=characters[0],clock=0,state='idle',elapsed=0,target=null,pending=null,arrival=null;
 const material=color=>new THREE.MeshStandardMaterial({color,roughness:.68});
 function mesh(geo,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m}
 function ellipsoid(parent,mat,x,y,z,sx,sy,sz){const o=mesh(new THREE.SphereGeometry(1,16,12),mat,parent,x,y,z);o.scale.set(sx,sy,sz);return o}
 function dispose(){root.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose()});root.clear()}
 function select(id){selected=characters.find(c=>c.id===id)||characters[0];dispose();const skin=material(selected.skin),hair=material(selected.hair),cloth=material(selected.color),white=material('#f2f3e9'),shoe=material('#222a40');
  const torso=new THREE.Group();torso.position.y=.83;root.add(torso);ellipsoid(torso,cloth,0,.37,0,.47,.55,.29);ellipsoid(torso,cloth,0,.76,-.06,.38,.22,.29);mesh(new THREE.BoxGeometry(.29,.3,.05),material('#ffffff'),torso,0,.28,.28).material.transparent=true;
  const head=new THREE.Group();head.position.set(0,1.12,0);torso.add(head);ellipsoid(head,skin,0,.28,.04,.65,.61,.55);ellipsoid(head,hair,0,.43,-.12,.68,.56,.53);for(let i=0;i<5;i++){const fringe=ellipsoid(head,hair,-.46+i*.23,.62,.35,.19,.27,.2);fringe.rotation.z=(i-2)*.22}
  const eyes=[];for(const side of [-1,1]){ellipsoid(head,skin,side*.64,.26,.02,.12,.15,.13);const eye=ellipsoid(head,material('#101a2c'),side*.24,.27,.557,.066,.106,.04);eyes.push(eye);ellipsoid(head,white,side*.24-.015,.3,.593,.019,.026,.012);ellipsoid(head,material('#d88b9a'),side*.38,.1,.51,.105,.04,.015)}
  const mouth=mesh(new THREE.TorusGeometry(.072,.014,5,12,Math.PI),material('#9e6371'),head,0,.07,.59);mouth.rotation.z=Math.PI;
  const arms=[],legs=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.name=side<0?'arm-left':'arm-right';arm.position.set(side*.43,.66,0);torso.add(arm);ellipsoid(arm,cloth,0,-.2,0,.17,.29,.17);ellipsoid(arm,skin,0,-.48,.015,.135,.145,.135).name=side<0?'hand-left':'hand-right';arms.push(arm);const leg=new THREE.Group();leg.position.set(side*.22,.7,0);root.add(leg);ellipsoid(leg,shoe,0,-.23,0,.16,.31,.17);ellipsoid(leg,white,0,-.53,.09,.19,.13,.27);legs.push(leg)}
  ellipsoid(torso,material('#59657c'),0,.35,-.3,.32,.38,.16);
  if(selected.accessory==='ears')for(const side of [-1,1]){const ear=mesh(new THREE.ConeGeometry(.21,.55,3),hair,head,side*.48,.99,0);ear.rotation.z=-side*.3;mesh(new THREE.ConeGeometry(.12,.35,3),cloth,head,side*.48,1,.06)}
  if(selected.accessory==='moon'){const pin=mesh(new THREE.TorusGeometry(.14,.05,6,20,Math.PI*1.55),material('#b7f3ff'),head,.5,.72,.3);pin.rotation.z=.5}
  if(selected.accessory==='flower'){for(let i=0;i<5;i++)ellipsoid(head,material('#f6db9b'),.49+Math.sin(i*1.256)*.12,.7+Math.cos(i*1.256)*.12,.35,.1,.1,.035);ellipsoid(head,cloth,.49,.7,.4,.06,.06,.04)}
  if(selected.accessory==='hat')mesh(new THREE.ConeGeometry(.86,.38,24),cloth,head,0,1.02,0);
  const shadow=mesh(new THREE.CircleGeometry(.65,32),new THREE.MeshBasicMaterial({color:0x020616,transparent:true,opacity:.35,depthWrite:false}),root,0,.02,0);shadow.rotation.x=-Math.PI/2;
  rig={torso,head,arms,legs,eyes};onState?.(selected,'Sẵn sàng khám phá');return selected;
 }
 function setState(value){state=value;elapsed=0;if(value==='idle')root.rotation.y=.35;root.userData.animation=value;onState?.(selected,{idle:'Đang ngắm cảnh',walk:'Đang bước tới',pray:'Đang chắp tay cầu nguyện',bow:'Cúi chào',bell:'Đang gõ chuông',wish:'Đang thả đèn',tarot:'Đang xáo bài',zodiac:'Đang ngắm sao'}[value]||value)}
 function moveTo(point,action='idle',callback){target=new THREE.Vector3(...point);arrival=callback;pending=action;if(reduced){root.position.copy(target);target=null;setState(action);callback?.();arrival=null}else setState('walk')}
 function visit(point){target=null;pending=null;arrival=null;root.position.set(point[0]+2,.18,point[2]+3);root.rotation.y=Math.PI;moveTo(point,'bow')}
 function act(action,point){if(point){const dest=new THREE.Vector3(...point);if(root.position.distanceTo(dest)>1)moveTo(point,action);else setState(action)}else{target=null;pending=null;arrival=null;setState(action)}}
 function update(dt){clock+=dt;elapsed+=dt;if(!rig)return;let walk=state==='walk';if(target){const delta=target.clone().sub(root.position),d=delta.length();if(d<.08){root.position.copy(target);target=null;setState(pending||'idle');pending=null;arrival?.();arrival=null}else{root.rotation.y=Math.atan2(delta.x,delta.z);root.position.addScaledVector(delta.normalize(),Math.min(d,dt*4))}}
  const motion=reduced?0:clock;rig.torso.rotation.set(0,0,0);rig.head.rotation.set(0,0,0);rig.arms.forEach(a=>a.rotation.set(0,0,0));rig.legs.forEach(a=>a.rotation.x=0);rig.torso.position.y=.83+(walk?Math.abs(Math.sin(motion*9))*.065:Math.sin(motion*2)*.018);
  if(walk){rig.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(motion*9+i*Math.PI)*.6);rig.arms.forEach((arm,i)=>arm.rotation.x=-Math.sin(motion*9+i*Math.PI)*.45)}
  else if(state==='pray'||state==='bow'){const v=reduced?1:Math.min(1,elapsed*2);rig.torso.rotation.x=v*.19;rig.head.rotation.x=v*.2;rig.arms[0].rotation.set(-1.05*v,0,.95*v);rig.arms[1].rotation.set(-1.05*v,0,-.95*v)}
  else if(state==='bell'){rig.arms[1].rotation.x=-1.2+(reduced?0:Math.sin(elapsed*8)*.4);rig.torso.rotation.y=-.1}
  else if(state==='wish'){rig.arms.forEach((a,i)=>{a.rotation.x=-1.9;a.rotation.z=(i?1:-1)*.2});rig.head.rotation.x=-.25}
  else if(state==='tarot'){rig.arms[0].rotation.set(-.9,0,.6);rig.arms[1].rotation.set(-.9,0,-.6);if(!reduced)rig.arms[1].rotation.y=Math.sin(motion*7)*.35}
  else if(state==='zodiac'){rig.head.rotation.x=-.35;rig.arms[1].rotation.x=-2.5}
  const blink=!reduced&&clock%4.7<.13;rig.eyes.forEach(eye=>eye.scale.y=blink?.012:.106);
  if(!target&&state!=='idle'&&state!=='walk'&&elapsed>4.5)setState('idle');
 }
 select('may');return{root,select,visit,act,update,get selected(){return selected},get state(){return state}};
}
