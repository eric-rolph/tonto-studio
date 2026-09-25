import test from 'node:test';
import assert from 'node:assert/strict';
import {compareAudio,readWav,wavInfo,floatWav,pitchEstimate,rms,features,featureLoss} from '../public/reference-audio.js';
import {renderPatch,fitPatch} from '../public/reference-render.js';
import {referenceRecipes} from '../public/reference-recipes.js';
import {freshPatch} from '../public/model.js';

test('float WAV preserves sample values, rate and channel layout',()=>{
 const a=Float32Array.from([0,-.9,.12345678,1.1]),b=Float32Array.from([.2,0,-.2,0]);
 const bytes=floatWav([a,b],96000),info=wavInfo(bytes),decoded=readWav(bytes);assert.equal(info.bits,32);assert.equal(info.format,3);assert.equal(info.sampleRate,96000);assert.deepEqual(decoded.channels,[a,b]);
 assert.throws(()=>wavInfo(bytes.slice(0,-3)),/truncated/);
});
test('24-bit PCM reader preserves signed extremes and odd chunk padding',()=>{
 const b=new ArrayBuffer(54),v=new DataView(b);for(const [offset,text]of [[0,'RIFF'],[8,'WAVE'],[12,'fmt '],[36,'data']])for(let i=0;i<text.length;i++)v.setUint8(offset+i,text.charCodeAt(i));v.setUint32(4,46,true);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint16(32,3,true);v.setUint16(34,24,true);v.setUint32(40,9,true);new Uint8Array(b,44,9).set([0,0,128,255,255,127,0,0,0]);const {channels}=readWav(b);assert.equal(channels[0][0],-1);assert.ok(channels[0][1]>.99999);assert.equal(channels[0][2],0);
});
test('alignment recovers gain, polarity and delay; exact match has zero errors',()=>{
 const rate=8000,ref=Float32Array.from({length:4000},(_,i)=>i<200?0:Math.sin(i*.177)*Math.exp(-(i-200)/1400)*.5),delay=37,candidate=Float32Array.from({length:ref.length+delay},(_,i)=>-2*(ref[i-delay]||0));
 const m=compareAudio(ref,candidate,rate).metrics;assert.equal(m.lagSamples,delay);assert.ok(m.waveformNrmse<1e-6);assert.ok(m.spectralDistance<1e-6);assert.ok(m.envelopeDistance<1e-6);assert.ok(Math.abs(m.waveGain+.5)<1e-6);assert.ok(m.correlation<-.99999);
 const reverse=compareAudio(candidate,ref,rate).metrics;assert.equal(reverse.lagSamples,-delay);assert.ok(reverse.waveformNrmse<1e-6);
});
test('silence is rejected; pitch and spectral distance detect a changed note',()=>{
 const rate=16000,tone=hz=>Float32Array.from({length:rate},(_,i)=>.5*Math.sin(2*Math.PI*hz*i/rate));assert.throws(()=>compareAudio(new Float32Array(100),tone(440),rate),/audible/);
 assert.ok(Math.abs(pitchEstimate(tone(440),rate).hz-440)<1);const same=featureLoss(features(tone(440),rate),features(tone(440),rate)),different=featureLoss(features(tone(440),rate),features(tone(880),rate));assert.ok(same.total<1e-9);assert.ok(different.spectral>1);
});
test('all reference recipes render deterministically with finite audible output',()=>{
 for(const r of referenceRecipes){const options={rate:16000,note:r.note,gate:.15,duration:.35};const audio=renderPatch(r.patch,options);assert.ok(audio.every(Number.isFinite),r.id);assert.ok(rms(audio)>1e-5,r.id);assert.deepEqual(audio,renderPatch(r.patch,options),r.id);}
});
test('external Moog filter input replaces the oscillator mixer',()=>{
 const patch=freshPatch();patch.params['moog.res']=0;patch.params['moog.initial']=1;patch.routes['moog.audio']='bridge.mic';const options={rate:16000,duration:.3};assert.equal(rms(renderPatch(patch,options)),0);delete patch.routes['moog.audio'];assert.ok(rms(renderPatch(patch,options))>.01);
});
test('offline controls settle immediately and direct taps render when cabinet fader is zero',()=>{
 const patch=freshPatch();patch.params['moog.level']=0;patch.params['moog.tune']=12;const audio=renderPatch(patch,{rate:16000,note:69,duration:.25,tap:'moog.oscA'});let crossings=0;for(let i=1;i<audio.length;i++)if(audio[i-1]<0&&audio[i]>=0)crossings++;assert.ok(Math.abs(crossings/.25-880)<=4);assert.ok(rms(audio)>.1);
});
test('fitting decreases a known target error and changes selected parameters only',()=>{
 const recipe=referenceRecipes.find(r=>r.id==='buchla-ping'),target=structuredClone(recipe.patch),options={rate:12000,note:60,gate:.15,duration:.6};target.params['buchla.decay']=.4;const ref=renderPatch(target,options),before=structuredClone(recipe.patch),fit=fitPatch(ref,before,options,['buchla.decay'],()=>{},3);assert.ok(fit.after.total<fit.before.total);assert.deepEqual(before,recipe.patch);for(const key of Object.keys(before.params))if(key!=='buchla.decay')assert.equal(fit.patch.params[key],before.params[key]);assert.deepEqual(fit.patch.routes,before.routes);
});
