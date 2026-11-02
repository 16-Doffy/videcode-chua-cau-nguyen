import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.min.js';
import {createCharacter,characters} from '../dist/characters.js';
import {drawTarot,tarotCards,signs,dailyReading,localDay,realms} from '../dist/realm-data.js';
import {messages,createDeck,messageCount} from '../dist/messages.js';

assert.equal(tarotCards.length,22);
assert.equal(signs.length,12);
assert.equal(realms.length,9);
assert.equal(realms.filter(r=>r.type==='prayer').length,4);
for(let i=0;i<300;i++)assert.equal(new Set(drawTarot(3,true).map(x=>x.card.id)).size,3);
assert.throws(()=>drawTarot(9));
for(const sign of signs){
  assert.deepEqual(dailyReading(sign.id,'2026-11-02'),dailyReading(sign.id,'2026-11-02'));
  assert.ok(dailyReading(sign.id).focus);
}
assert.equal(localDay(new Date('2026-11-01T18:00:00Z')),'2026-11-02');
assert.equal(localDay(new Date('2026-11-01T16:59:59Z')),'2026-11-01');
assert.equal(messageCount,100);
const draw=createDeck();
for(const [key,items] of Object.entries(messages)){
  const first=Array.from({length:items.length},()=>draw(key));
  assert.equal(new Set(first.map(x=>x.id)).size,items.length);
  assert.notEqual(draw(key).id,first.at(-1).id);
}
const actor=createCharacter(new THREE.Scene(),{reduced:false});
for(const character of characters){assert.equal(actor.select(character.id).id,character.id);assert.ok(actor.root.children.length)}
actor.visit([10,.18,10]);assert.equal(actor.state,'walk');
for(let i=0;i<100;i++)actor.update(.05);
assert.ok(actor.root.position.distanceTo(new THREE.Vector3(10,.18,10))<.1);
for(const pose of ['pray','bow','bell','wish','tarot','zodiac']){actor.act(pose);actor.update(1);assert.equal(actor.state,pose)}
actor.act('pray');actor.update(1);actor.root.updateMatrixWorld(true);
const left=actor.root.getObjectByName('hand-left').getWorldPosition(new THREE.Vector3());
const right=actor.root.getObjectByName('hand-right').getWorldPosition(new THREE.Vector3());
assert.ok(left.distanceTo(right)<.3,'Prayer animation brings both hands together');
actor.update(5);assert.equal(actor.state,'idle');
const calm=createCharacter(new THREE.Scene(),{reduced:true});calm.visit([4,.18,6]);assert.equal(calm.state,'bow');assert.equal(calm.root.position.x,4);
console.log('Core checks passed: characters, motion, prayer pose, tarot, zodiac, day boundaries and message decks.');
