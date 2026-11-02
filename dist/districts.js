import * as THREE from './vendor/three.module.min.js';
import {realms} from './realm-data.js';
export function buildDistricts(scene,{box,cylinder,roof,mat,glow}){
const rotating=[],labels=[];
for(const r of realms.filter(r=>r.type!=='hub')){
 const g=new THREE.Group();g.position.set(r.point[0],0,r.point[2]);scene.add(g);const stone=mat(0x19243c),edge=mat(0x30425b),accent=mat(r.color,r.color,.65,.5,.45),dark=mat(0x0e162a);
 cylinder(9.5,7,1.8,0,-.95,0,stone,g,12);cylinder(7,2,5,0,-4,0,dark,g,8);cylinder(9.5,9.5,.08,0,.01,0,edge,g,12);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(9.6,.035,4,80),accent);ring.rotation.x=Math.PI/2;ring.position.y=.15;g.add(ring);
 const pathToHub=new THREE.Vector3(r.point[0],0,r.point[2]),len=pathToHub.length();const dir=pathToHub.clone().normalize(),from=dir.clone().multiplyScalar(18),to=pathToHub.clone().addScaledVector(dir,-9);if(to.distanceTo(from)>1){const bridge=new THREE.Group();bridge.position.copy(from.clone().add(to).multiplyScalar(.5));bridge.rotation.y=Math.atan2(dir.x,dir.z);scene.add(bridge);const length=from.distanceTo(to);box(2,.15,length,0,-.1,0,stone,bridge);for(const x of [-1,1])box(.035,.035,length,x,.3,0,accent,bridge);for(let z=-length/2;z<length/2;z+=1)box(1.9,.02,.04,0,0,z,edge,bridge)}
 if(r.type==='prayer'){
  for(let j=0;j<2;j++)box(8-j,.25,6-j,0,.2+j*.25,-1,edge,g);for(const x of [-3,3])for(const z of [-3.3,1.3])cylinder(.14,.19,3.9,x,2.5,z,accent,g);box(5.6,3.1,.3,0,2.15,-3.2,dark,g);const roofGroup=new THREE.Group();roofGroup.position.z=-1;g.add(roofGroup);roof(9,7,4.5,roofGroup);roof(5.6,4.3,6.6,roofGroup);
  cylinder(1,1.3,.4,0,.8,-.8,edge,g);const relic=new THREE.Mesh(r.id==='family'?new THREE.TorusKnotGeometry(.46,.12,48,8):r.id==='love'?new THREE.TorusGeometry(.7,.12,8,40):r.id==='study'?new THREE.OctahedronGeometry(.7):new THREE.SphereGeometry(.55,20,12),accent);relic.position.set(0,1.8,-.8);relic.userData.interaction=r.id;g.add(relic);rotating.push(relic);glow(0,1.8,-.6,r.color,3,g);
  for(const x of [-3,3])for(const z of [3,5]){cylinder(.25,.35,.5,x,.35,z,edge,g);glow(x,.95,z,r.color,1.7,g);const lamp=box(.3,.4,.3,x,.9,z,accent,g);lamp.userData.interaction=r.id}
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.8,1),mat(r.id==='love'?0x9c6c92:r.id==='family'?0x9b795b:0x3c6976));shrub.position.set(Math.cos(a)*7,.55,Math.sin(a)*7);shrub.scale.y=.7;g.add(shrub)}
 }else if(r.id==='tarot'){
  cylinder(4.7,5.5,.3,0,.3,0,edge,g,10);cylinder(1.7,1.3,1.2,0,1.05,-.8,dark,g);cylinder(2.1,2.1,.12,0,1.7,-.8,accent,g,32);
  for(let i=0;i<7;i++){const card=box(.65,.04,1.1,(i-3)*.42,1.81,-.7+Math.abs(i-3)*.12,dark,g);card.rotation.y=(i-3)*-.16;card.userData.interaction='tarot';box(.35,.01,.75,(i-3)*.42,1.84,-.7+Math.abs(i-3)*.12,accent,g)}
  const arch=new THREE.Mesh(new THREE.TorusGeometry(3.6,.12,8,64,Math.PI),accent);arch.position.set(0,3,-3);g.add(arch);for(const x of [-3.6,3.6])cylinder(.12,.18,3,x,1.5,-3,accent,g);glow(0,4,-3,r.color,7,g);
  for(let i=0;i<5;i++){const star=new THREE.Mesh(new THREE.OctahedronGeometry(.2),accent);star.position.set(Math.sin(i*1.6)*5,2+Math.random()*2,Math.cos(i*1.6)*5);g.add(star);rotating.push(star)}
 }else{
  cylinder(5.5,6,.3,0,.3,0,edge,g,32);const celestial=new THREE.Group();celestial.position.set(0,3,-1);g.add(celestial);for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4+i*.4,.045,6,80),accent);ring.rotation.set(i*.8,i*.5,i*.7);celestial.add(ring)}rotating.push(celestial);const globe=new THREE.Mesh(new THREE.IcosahedronGeometry(.8,2),mat(0x638bba,r.color,.8,.6,.3));celestial.add(globe);glow(0,3,-1,r.color,5,g);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const star=new THREE.Mesh(new THREE.OctahedronGeometry(.15),accent);star.position.set(Math.sin(a)*6,1.1,Math.cos(a)*6);star.userData.interaction='zodiac';g.add(star)}
 }
 // A portal gives each island a clear arrival point and an action to discover.
 const portal=new THREE.Mesh(new THREE.TorusGeometry(1.1,.06,6,50),accent);portal.position.set(0,1.4,7);portal.userData.interaction=r.id;g.add(portal);rotating.push(portal);
 const c=document.createElement('canvas');c.width=640;c.height=100;const ctx=c.getContext('2d');ctx.font='500 34px sans-serif';ctx.textAlign='center';ctx.fillStyle=r.color;ctx.fillText(r.name,320,55);const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,opacity:.9}));label.position.set(0,9,-1);label.scale.set(7,1.1,1);g.add(label);labels.push(label);
}
return{update(dt){for(const obj of rotating)obj.rotation.y+=dt*.35}};
}
