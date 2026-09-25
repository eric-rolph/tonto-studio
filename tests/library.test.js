import test from 'node:test';
import assert from 'node:assert/strict';
import {studioLibrary,arpToTonto} from '../public/preset-library.js';
import {tontoExpansion} from '../public/preset-bank.js';
import {arpLibrary} from '../public/arp/model.js';
import {validatePatch,controls,ports} from '../public/model.js';
import {renderPreview} from '../public/preset-preview-render.js';
test('library has distinct named patches with valid controls, cables and complete performance memories',()=>{
 assert.equal(studioLibrary.length,157);assert.equal(new Set(studioLibrary.map(e=>e.id)).size,157);assert.equal(new Set(studioLibrary.map(e=>e.name)).size,157);assert.equal(new Set(tontoExpansion.map(e=>JSON.stringify([e.params,e.routes,e.extra]))).size,62);
 for(const e of studioLibrary){assert.deepEqual(validatePatch(e.patch),e.patch,e.name);assert.ok(e.description&&e.play);for(const [k,v]of Object.entries(e.patch.params)){assert.ok(Number.isFinite(v)&&v>=controls[k].min&&v<=controls[k].max,e.name+' '+k);}for(const [d,s]of Object.entries(e.patch.routes))assert.ok(ports[d]?.direction==='input'&&ports[s]?.direction==='output',e.name);if(e.mode==='Performance'){assert.ok(e.patch.performance.notes.length>=3,e.name);assert.ok(Object.keys(e.patch.performance.lanes).length,e.name);}}
 for(const e of arpLibrary){const p=arpToTonto(e.patch);for(const [k,v]of Object.entries(e.patch.params))assert.equal(p.params['arp.'+k],v,e.name+' '+k);}
});
test('every library preview renders finite bounded audio at 48 kHz, except the deliberate empty patch',()=>{for(const e of studioLibrary){const r=renderPreview(e);assert.ok(Number.isFinite(r.rms)&&r.peak<=1.01,e.name+' finite and bounded');if(e.id==='studio-10')assert.equal(r.rms,0);else assert.ok(r.rms>.0005,e.name+' audible: '+r.rms);assert.equal(Math.abs(r.left[0]),0);assert.ok(Math.abs(r.left.at(-1))<.002,e.name+' faded ending');}});
