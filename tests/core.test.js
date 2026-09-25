import test from 'node:test';
import assert from 'node:assert/strict';
import {ModularCore} from '../public/dsp.js';
import {compileCable,transfer,cableIssues} from '../public/bus.js';
import {freshPatch,presets,validatePatch,ports,matrixDestinations} from '../public/model.js';
import {encodeWav} from '../public/tape.js';
test('pitch conversion has the correct direction; historical raw voltage stays raw',()=>{
 const state=freshPatch();let c=compileCable('buchla.pitchOut','moog.pitch',{},state);assert.equal(transfer(c,1.2),1);
 c=compileCable('bridge.pitch','buchla.pitch',{},state);assert.equal(transfer(c,1),1.2);
 state.mode='historical';c=compileCable('buchla.pitchOut','moog.pitch',{adapter:true},state);assert.ok(Math.abs(transfer(c,1.2)-1.2*c.loading)<1e-12);assert.ok(transfer(c,1.2)>1);
 c=compileCable('buchla.pitchOut','moog.pitch',{adapter:true,scale:true},state);assert.ok(Math.abs(transfer(c,1.2)-c.loading)<1e-12);
});
test('trigger conversion handles both polarities; missing adapters leave S-Trig idle',()=>{
 const state=freshPatch();let c=compileCable('bridge.gate','moog.gate',{},state);assert.equal(transfer(c,5),0);assert.equal(transfer(c,0),5);
 c=compileCable('moog.gateOut','euro.gate',{},state);assert.equal(transfer(c,0),5);assert.equal(transfer(c,5),0);
 state.mode='historical';c=compileCable('bridge.gate','moog.gate',{},state);assert.equal(transfer(c,5),5);
 c=compileCable('bridge.gate','moog.gate',{adapter:true},state);assert.equal(transfer(c,5),5);
 c=compileCable('bridge.gate','moog.gate',{adapter:true,trigger:true},state);assert.equal(transfer(c,5),0);
});
test('ground bonding removes modeled hum and modern mode bypasses it',()=>{
 const state=freshPatch();state.mode='historical';state.grounds.buchla=false;
 let c=compileCable('buchla.function','arp.filterEnv',{adapter:true},state);assert.equal(transfer(c,0,.1),.1);assert.equal(cableIssues('buchla.function','arp.filterEnv',{adapter:true},state).length,1);
 state.grounds.buchla=true;c=compileCable('buchla.function','arp.filterEnv',{adapter:true},state);assert.equal(transfer(c,0,.1),0);
});
test('microphone routes to every exposed input; multiple destinations are retained',()=>{
 const state=freshPatch();for(const p of Object.values(ports))if(p.direction==='input')state.routes[p.id]='bridge.mic';const core=new ModularCore(24000);core.configure(state);assert.equal(Object.keys(core.state.routes).length,Object.values(ports).filter(p=>p.direction==='input').length);
 for(let i=0;i<5000;i++){const v=core.tick(Math.sin(i*.12)*.1);assert.ok(v.every(Number.isFinite));}
});
test('all musical presets produce finite bounded audible audio',()=>{
 for(const preset of presets.slice(0,8)){const core=new ModularCore(24000);core.configure(preset.patch);core.on(55);let energy=0;for(let i=0;i<12000;i++){const v=core.tick(Math.sin(i*.073)*.2);assert.ok(v.every(Number.isFinite),preset.name);assert.ok(Math.abs(v[0])<=1&&Math.abs(v[1])<=1,preset.name);if(i>2000)energy+=v[0]**2+v[1]**2;}assert.ok(energy>1e-4,`${preset.name} is silent (${energy})`);}
});
test('EMS pins sum signals and an external cable overrides a matrix column',()=>{
 const core=new ModularCore(24000),state=freshPatch();state.matrix={'0:6':1,'1:6':.5};core.configure(state);core.signals['ems.osc1']=.4;core.signals['ems.osc2']=.2;assert.ok(Math.abs(core.emsInput('ems.audio')-.5)<1e-12);state.routes['ems.audio']='bridge.mic';core.configure(state);core.previous['bridge.mic']=.75;assert.equal(core.emsInput('ems.audio'),.75);assert.equal(matrixDestinations.length,16);
});
test('feedback routes remain finite',()=>{
 const state=freshPatch();state.params['euro.level']=.7;state.routes={'moog.audio':'moog.out','moog.fmIn':'ems.out','ems.feedback':'bridge.mix','euro.audio':'euro.grains','arp.filterFM':'bridge.mix'};const core=new ModularCore(24000);core.configure(state);core.on(60);for(let i=0;i<20000;i++)assert.ok(core.tick(.1).every(Number.isFinite));
});
test('patch validation clamps values and rejects invalid connections and matrix cells',()=>{
 const p=validatePatch({version:1,params:{master:12,'moog.cutoff':-50},routes:{'moog.pitch':'missing','euro.gate':'bridge.gate'},matrix:{'99:0':1,'2:3':.5},steps:[0,1,2,3,4,5,6,999]});assert.equal(p.params.master,1);assert.equal(p.params['moog.cutoff'],30);assert.deepEqual(p.routes,{'euro.gate':'bridge.gate'});assert.deepEqual(p.matrix,{'2:3':.5});assert.equal(p.steps[7],24);
});
test('WAV export keeps valid stereo PCM header and length',async()=>{
 const b=await encodeWav([new Float32Array(100),new Float32Array(100)],48000).arrayBuffer();const v=new DataView(b);assert.equal(b.byteLength,444);assert.equal(v.getUint16(22,true),2);assert.equal(v.getUint32(24,true),48000);
});
test('bridge trigger converter reads S-Trig polarity without double inversion',()=>{
 const state=freshPatch();state.routes['bridge.triggerIn']='moog.gateOut';const core=new ModularCore(24000);core.configure(state);core.on(60);for(let i=0;i<5;i++)core.tick();assert.equal(core.previous['bridge.strig'],0);assert.equal(core.previous['bridge.vtrig'],5);core.off();for(let i=0;i<5;i++)core.tick();assert.equal(core.previous['bridge.strig'],5);assert.equal(core.previous['bridge.vtrig'],0);
});
