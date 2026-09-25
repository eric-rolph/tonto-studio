import test from 'node:test';
import assert from 'node:assert/strict';
import {StepSequencer,sequenceDefaults} from '../public/sequencer.js';
import {Utilities,quantize} from '../public/utilities.js';
import {freshPatch,validatePatch,presets,defaults} from '../public/model.js';
import {ModularCore} from '../public/dsp.js';

test('old patches gain sequencer defaults; new rows, modes and settings round-trip safely',()=>{
 const old=validatePatch({version:1,params:{},steps:[0,1,2,3,4,5,6,7]});assert.deepEqual(old.sequence,sequenceDefaults());
 const patch=freshPatch();patch.sequence={length:99,width:0,direction:'bad',division:3,rowB:Array(8).fill(20),rowC:[0,1,2,3,4,5,-2,-3],modes:['rest','skip','x','play','play','play','play','play'],transpose:false};
 const clean=validatePatch(patch);assert.equal(clean.sequence.length,8);assert.equal(clean.sequence.width,.05);assert.equal(clean.sequence.direction,'forward');assert.equal(clean.sequence.division,4);assert.equal(clean.sequence.rowB[0],5);assert.equal(clean.sequence.modes[2],'play');assert.deepEqual(validatePatch(JSON.parse(JSON.stringify(clean))),clean);
});
test('internal clock emits exact step order, rests preserve clock and skipped steps consume no time',()=>{
 const state=freshPatch();state.sequencer=true;state.sequence.length=4;state.sequence.width=.5;state.sequence.modes[1]='rest';state.sequence.modes[2]='skip';const seq=new StepSequencer(1000);seq.configure(state);
 const observed=[];let was=false,high=0;
 for(let i=0;i<751;i++){seq.tick(120,0,null,0);if(seq.pulse&&!was)observed.push([seq.step,seq.gate]);was=!!seq.pulse;if(i<125&&seq.pulse)high++;}
 assert.deepEqual(observed.slice(0,6),[[0,5],[1,0],[3,5],[0,5],[1,0],[3,5]]);assert.ok(Math.abs(high-62.5)<1);
 state.sequence.modes=Array(8).fill('skip');seq.configure(state);for(let i=0;i<1000;i++){seq.tick(120,0,null,0);assert.equal(seq.gate,0);assert.equal(seq.pulse,0);}
});
test('external clock uses rising edges, hysteresis, reset, direction and a stopped manual step',()=>{
 const state=freshPatch();state.sequencer=true;state.sequence.length=3;const seq=new StepSequencer(1000);seq.configure(state);
 const edge=()=>{seq.tick(120,0,0,0);seq.tick(120,0,5,0);return seq.step;};
 assert.equal(edge(),0);assert.equal(edge(),1);for(let i=0;i<100;i++)seq.tick(120,0,3,0);assert.equal(seq.step,1);
 seq.tick(120,0,1.5,0);seq.tick(120,0,2.5,0);assert.equal(seq.step,1);assert.equal(edge(),2);
 seq.tick(120,0,0,5);assert.equal(seq.step,0);assert.equal(seq.gate,0);assert.equal(edge(),0);
 state.sequence.direction='reverse';seq.configure(state);seq.command('reset');seq.tick(120,0,0,0);assert.equal(edge(),2);assert.equal(edge(),1);
 state.sequence.direction='pendulum';seq.configure(state);seq.command('reset');seq.tick(120,0,0,0);assert.deepEqual(Array.from({length:6},edge),[0,1,2,1,0,1]);
 state.sequencer=false;seq.configure(state);seq.command('step');seq.tick(120,0,null,0);assert.equal(seq.step,1);assert.equal(seq.gate,5);for(let i=0;i<51;i++)seq.tick(120,0,null,0);assert.equal(seq.gate,0);
});
test('clock divisions and sequential switch route actual signals and reset deterministically',()=>{
 const u=new Utilities(1000),s={},p={...defaults},values={'tools.clockIn':0,'tools.switch1':.2,'tools.switch2':-.4,'tools.switch3':.8};const input=id=>id==='tools.switchClock'?s['tools.div2']||0:values[id]||0;
 const counts={2:0,4:0,8:0},switched=[];
 for(let pulse=0;pulse<8;pulse++){values['tools.clockIn']=0;u.tick(p,s,input);values['tools.clockIn']=5;u.tick(p,s,input);for(const d of [2,4,8])if(s['tools.div'+d])counts[d]++;if(s['tools.div2'])switched.push(s['tools.switchOut']);}
 assert.deepEqual(counts,{2:4,4:2,8:1});assert.deepEqual(switched,[.2,-.4,.8,.2]);u.tick(p,s,input,true);assert.equal(s['tools.switchOut'],.2);assert.equal(s['tools.div8'],5);
});
test('utilities mix DC and audio, invert, multiply through both VCAs, and slew at seconds per volt',()=>{
 const u=new Utilities(1000),s={},p={...defaults,'tools.mix1':.5,'tools.mix2':-1,'tools.mix3':2,'tools.offset':.25,'tools.gainB':.1,'tools.slewRise':.1,'tools.slewFall':.2},values={'tools.mix1':2,'tools.mix2':.5,'tools.mix3':-.25,'tools.vcaAIn':-.8,'tools.vcaACV':5,'tools.vcaBIn':.4,'tools.vcaBCV':20,'tools.slewIn':1};const input=id=>values[id]||0;
 u.tick(p,s,input);assert.equal(s['tools.mixOut'],.25);assert.equal(s['tools.vcaA'],-.4);assert.equal(s['tools.vcaB'],.4);assert.equal(s['tools.slew'],.01);
 for(let i=1;i<100;i++)u.tick(p,s,input);assert.equal(s['tools.slew'],1);values['tools.slewIn']=0;for(let i=0;i<100;i++)u.tick(p,s,input);assert.ok(Math.abs(s['tools.slew']-.5)<1e-10);
});
test('function generator finishes a rise/fall cycle on a held gate and loops only with cycle enabled',()=>{
 const u=new Utilities(1000),s={},p={...defaults,'tools.rise':.01,'tools.fall':.02};let gate=5,ends=0,peak=0;const input=id=>id==='tools.functionGate'?gate:0;
 for(let i=0;i<100;i++){u.tick(p,s,input);peak=Math.max(peak,s['tools.function']);if(s['tools.end'])ends++;}assert.equal(peak,10);assert.equal(ends,1);assert.equal(s['tools.function'],0);
 p['tools.cycle']=1;for(let i=0;i<100;i++){u.tick(p,s,input);if(s['tools.end'])ends++;}assert.ok(ends>=4);
});
test('quantizer handles negative voltages, musical scales and root offsets',()=>{
 assert.equal(quantize(-.08),-1/12);assert.equal(quantize(3.04),3);assert.equal(quantize(3/12,1),2/12);assert.equal(quantize(3/12,2),3/12);assert.equal(quantize(1/12,1,2),1/12);
 for(let i=-36;i<=36;i++){const note=Math.round(quantize(i/12,3)*12);assert.ok([0,2,4,7,9].includes((note%12+12)%12));}
});
test('new presets generate bounded audio with cross-cabinet dependencies and every utility jack',()=>{
 for(const preset of presets.slice(10)){const core=new ModularCore(24000);core.configure(preset.patch);Object.assign(core.params,core.target);core.arp.params={...core.arp.target};if(!preset.patch.sequencer)core.on(55);let energy=0;for(let i=0;i<16000;i++){const output=core.tick();assert.ok(output.every(Number.isFinite));energy+=output[0]**2+output[1]**2;}assert.ok(energy>1e-3,preset.name);}
 const state=freshPatch();state.sequencer=true;state.routes={'moog.pitch':'tools.slew','moog.gate':'bridge.clock','tools.seqClock':'bridge.lfoOut'};const core=new ModularCore(24000);core.configure(state);const steps=new Set();for(let i=0;i<24000;i++){core.tick();steps.add(core.step);}assert.ok(steps.size>=3);assert.ok(core.previous['tools.slew']>0);
});
