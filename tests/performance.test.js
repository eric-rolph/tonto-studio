import test from 'node:test';
import assert from 'node:assert/strict';
import {performanceDefaults,validatePerformance,quantizeNotes,PerformanceClock} from '../public/performance-model.js';
import {freshPatch,validatePatch,controls} from '../public/model.js';
import {controllerValue} from '../public/midi-learn.js';
import {PatchHistory} from '../public/history.js';
import {ModularCore} from '../public/dsp.js';
import {packSession,unpackSession} from '../public/session.js';

test('old patches remain valid and bounded performance data survives patch and session files',async()=>{
 const p=freshPatch();assert.deepEqual(validatePatch({version:1,params:{}}).performance,performanceDefaults());
 p.performance={bars:1,notes:[{note:60,at:.2,length:.4,velocity:.7},{note:999,at:3.9,length:50,velocity:3},{note:1,at:Infinity,length:1,velocity:1}],lanes:{'moog.cutoff':[{at:0,value:500},{at:1,value:900}],master:[{at:0,value:1}],missing:[{at:0,value:1}]}};
 const clean=validatePatch(p);assert.equal(clean.performance.notes.length,2);assert.ok(clean.performance.notes.every(n=>n.at+n.length<=4));assert.deepEqual(Object.keys(clean.performance.lanes),['moog.cutoff']);assert.deepEqual(validatePatch(JSON.parse(JSON.stringify(clean))),clean);
 const restored=await unpackSession(packSession('tonto-studio',clean,{takes:[]}), 'tonto-studio');assert.deepEqual(validatePatch(restored.patch),clean);
 const huge=validatePerformance({notes:Array(1000).fill({note:60,at:0,length:1,velocity:1}),lanes:Object.fromEntries(Object.keys(controls).slice(0,100).map(id=>[id,Array(3000).fill({at:0,value:1})]))},controls);assert.equal(huge.notes.length,512);assert.ok(Object.keys(huge.lanes).length<=32);assert.ok(Object.values(huge.lanes).flat().length<=12000);
});
test('quantization preserves velocities, clips endings, and keeps a last-beat note inside the loop',()=>{
 assert.deepEqual(quantizeNotes([{note:60,at:.14,length:.51,velocity:.7},{note:64,at:3.99,length:.5,velocity:.9}],.25,4),[{note:60,at:.25,length:.5,velocity:.7},{note:64,at:3.75,length:.25,velocity:.9}]);
});
test('performance notes and monitor clicks start after an exact count-in at every supported sample rate',()=>{
 for(const rate of [44100,48000,96000]){let frame=0;const events=[],clock=new PerformanceClock(rate,n=>events.push({frame,n}),()=>{}),clip={...performanceDefaults(),bars:1,loop:false,notes:[{at:0,length:.5,note:60,velocity:.8},{at:1,length:.25,note:67,velocity:1}]};clock.start(clip,{tempo:120,startFrame:64,countIn:4});let click=0;for(frame=0;frame<64+rate*4+2;frame++)click=Math.max(click,Math.abs(clock.tick(frame)));assert.ok(click>.01);assert.deepEqual(events.filter(e=>e.n?.retrigger).map(e=>[e.frame,e.n.note]),[[64+rate*2,60],[64+rate*2+Math.round(rate*.5),67]]);assert.equal(clock.running,false);assert.equal(events.at(-1).n,null);}
});
test('repeating notes release at the boundary; live keys take priority and survive Stop',()=>{
 let frame=0;const events=[],clock=new PerformanceClock(1000,n=>events.push({frame,n}),()=>{});clock.start({...performanceDefaults(),bars:1,notes:[{at:0,length:4,note:60,velocity:1}]},{tempo:120});for(frame=0;frame<=2000;frame++)clock.tick(frame);assert.deepEqual(events.filter(e=>e.n?.retrigger).map(e=>e.frame),[0,2000]);clock.liveOn({note:72,velocity:1,lower:72,upper:72,retrigger:true});clock.stop();assert.equal(events.at(-1).n.note,72);clock.liveOff();assert.equal(events.at(-1).n,null);assert.equal(clock.held.size,0);
});
test('automation starts from its baseline every loop and stays out of the saved static controls',()=>{
 let frame=0;const values=[],clock=new PerformanceClock(1024,()=>{},(id,v)=>values.push([frame,id,v]));clock.start({...performanceDefaults(),bars:1,lanes:{'moog.cutoff':[{at:0,value:200},{at:1,value:1000}] }},{tempo:120});for(frame=0;frame<=2048;frame++)clock.tick(frame);assert.deepEqual(values,[[0,'moog.cutoff',200],[512,'moog.cutoff',1000],[2048,'moog.cutoff',200]]);
});
test('record mode does not replay the old loop and ends on the bar boundary',()=>{
 let ons=0;const clock=new PerformanceClock(1000,n=>{if(n)ons++;},()=>assert.fail('Old automation played during recording'));clock.start({...performanceDefaults(),bars:1,notes:[{at:0,length:1,note:60,velocity:1}],lanes:{x:[{at:0,value:1}]}},{tempo:120,recording:true});for(let frame=0;frame<=2000;frame++)clock.tick(frame);assert.equal(ons,0);assert.equal(clock.running,false);
});
test('recorded notes produce real synthesizer audio and release after transport stop',()=>{
 const core=new ModularCore(48000),p=freshPatch();p.params['moog.release']=.01;core.configure(p);const clock=new PerformanceClock(48000,n=>n?core.on(n.note,n.velocity,n.retrigger,n.lower,n.upper):core.off(),(k,v)=>core.set({[k]:v}));clock.start({...performanceDefaults(),notes:[{at:0,length:1,note:60,velocity:1}]},{tempo:120});let peak=0;for(let i=0;i<4800;i++){clock.tick(i);peak=Math.max(peak,Math.abs(core.tick()[0]));}assert.ok(peak>.01);clock.stop();for(let i=0;i<48000;i++)core.tick();assert.equal(core.gate,false);assert.ok(Math.abs(core.last[0])<.0001);
});
test('MIDI mappings honor logarithmic ranges and discrete switches and selectors',()=>{
 assert.equal(controllerValue('moog.cutoff',0),controls['moog.cutoff'].min);assert.equal(controllerValue('moog.cutoff',127),controls['moog.cutoff'].max);const c=controls['moog.cutoff'];assert.ok(Math.abs(controllerValue('moog.cutoff',63.5)-Math.sqrt(c.min*c.max))<.001);assert.equal(controllerValue('euro.freeze',63),0);assert.equal(controllerValue('euro.freeze',64),1);assert.equal(controllerValue('mains',64),60);assert.equal(controllerValue('fx.monitor',127),6);
});
test('patch history groups a sweep, restores cables, redoes, and branches without reviving transport',()=>{
 let p=freshPatch();const h=new PatchHistory(()=>p,next=>p=next);p.params['moog.cutoff']=400;p.params['moog.cutoff']=500;h.flush();p.routes['moog.audio']='bridge.mic';p.sequencer=true;h.flush();h.travel();assert.deepEqual(p.routes,{});assert.equal(p.sequencer,false);h.travel();assert.equal(p.params['moog.cutoff'],freshPatch().params['moog.cutoff']);h.travel(true);assert.equal(p.params['moog.cutoff'],500);p.params['moog.cutoff']=700;h.flush();assert.equal(h.future.length,0);
});
