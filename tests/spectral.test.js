import test from 'node:test';
import assert from 'node:assert/strict';
import {Biquad,SpectralProcessor} from '../public/spectral.js';
import {defaults,freshPatch} from '../public/model.js';
import {ModularCore} from '../public/dsp.js';
const rms=data=>Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);
test('low/high/band-pass filters pass intended frequencies at 44.1, 48 and 96 kHz',()=>{
 for(const rate of [44100,48000,96000]){
  const energy=(type,hz)=>{const filter=new Biquad(rate,type,1000,1);let energy=0;for(let i=0;i<rate/4;i++){const y=filter.tick(Math.sin(i/rate*Math.PI*2*hz));if(i>rate/10)energy+=y*y;}return energy;};
  assert.ok(energy('low',100)>energy('low',8000)*100);assert.ok(energy('high',8000)>energy('high',100)*100);assert.ok(energy('band',1000)>energy('band',100)*50);
 }
});
test('filter-bank faders isolate bands, while vocoder needs both modulator and carrier',()=>{
 const p={...defaults};for(let i=0;i<12;i++)p['fx.band'+i]=0;p['fx.band6']=1;p['fx.lowBand']=0;p['fx.highBand']=0;
 const render=(hz,mod,carrier)=>{const fx=new SpectralProcessor(24000),signals={},out=[],voc=[];let i=0;const input=id=>id==='fx.audio'?Math.sin(i/24000*Math.PI*2*hz):id==='fx.modulator'?mod*Math.sin(i/24000*Math.PI*2*1000):id==='fx.carrier'?carrier*Math.sin(i/24000*Math.PI*2*1000):0;for(i=0;i<12000;i++){fx.tick(p,signals,input);if(i>4000){out.push(signals['fx.bank']);voc.push(signals['fx.vocoder']);}}return {bank:rms(out),vocoder:rms(voc),env:fx.envelopes[6]};};
 assert.ok(render(1000,.1,.1).bank>render(125,.1,.1).bank*10);assert.equal(render(1000,0,.1).vocoder,0);assert.equal(render(1000,.1,0).vocoder,0);const active=render(1000,.1,.1);assert.ok(active.vocoder>.005);assert.ok(active.env>.01);
});
test('spectral normal connections wake their source even with its cabinet fader down',()=>{
 const p=freshPatch();p.params['moog.level']=0;p.params['fx.level']=.7;p.params['fx.monitor']=4;const core=new ModularCore(24000);core.configure(p);Object.assign(core.params,core.target);assert.equal(core.active.moog,true);let energy=0;for(let i=0;i<10000;i++)energy+=core.tick(.2*Math.sin(i*.12))[0]**2;assert.ok(energy>.01);
});
test('every spectral jack remains finite with feedback and extreme CV',()=>{
 const p=freshPatch();p.params['moog.level']=0;p.params['fx.level']=.7;p.params['fx.q']=8;p.params['fx.sensitivity']=30;p.routes={'fx.audio':'fx.high','fx.cutCV':'bridge.mic','fx.modulator':'fx.bank','fx.carrier':'fx.out'};const core=new ModularCore(24000);core.configure(p);for(let i=0;i<24000;i++)assert.ok(core.tick(Math.sin(i*.3)).every(Number.isFinite));
});
