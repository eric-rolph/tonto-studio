import {test,expect} from '@playwright/test';
import {floatWav} from '../public/reference-audio.js';
test.beforeEach(async({page})=>{await page.goto('/');});

test('live signal shows real output and mic independently, without changing audio levels',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await expect(page.locator('#scope-state')).toHaveText('AUDIO OFF');await page.locator('#power').click();await expect(page.locator('#audio-state')).toHaveText('AUDIO RUNNING');await page.evaluate(()=>window.studio.engine.on(60));
 await expect.poll(()=>page.locator('#out-meter').evaluate(el=>el.value)).toBeGreaterThan(.01);
 await expect.poll(()=>page.locator('#scope').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let y=0;y<c.height;y++)if(Math.abs(y-c.height/2)>4)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(d[i]>210&&d[i+1]>145&&d[i+1]<195&&d[i+2]<145)count++;}return count;})).toBeGreaterThan(20);
 await page.evaluate(()=>{const ctx=window.studio.engine.ctx,o=ctx.createOscillator(),g=ctx.createGain(),d=ctx.createMediaStreamDestination();o.frequency.value=220;g.gain.value=.2;o.connect(g).connect(d);o.start();navigator.mediaDevices.getUserMedia=async()=>d.stream;});await page.locator('#mic').click();
 await expect.poll(()=>page.locator('#scope-mic-meter').evaluate(el=>el.value)).toBeGreaterThan(.1);
 await page.evaluate(()=>window.studio.engine.set('master',0));await expect.poll(()=>page.locator('#out-meter').evaluate(el=>el.value)).toBeLessThan(.0001);await expect.poll(()=>page.locator('#scope-mic-meter').evaluate(el=>el.value)).toBeGreaterThan(.1);
 await page.locator('#scope-gain').selectOption('8');await page.locator('#scope-window').selectOption('5');await expect(page.locator('#scope-state')).toContainText('5.0 ms');expect(await page.evaluate(()=>window.studio.engine.params.master)).toBe(0);
 await page.evaluate(()=>window.studio.engine.ctx.suspend());await expect(page.locator('#scope-state')).toHaveText('AUDIO SUSPENDED');await expect.poll(()=>page.locator('#scope-mic-meter').evaluate(el=>el.value)).toBe(0);expect(errors).toEqual([]);
});

test('live signal is visible at desktop, narrow and mobile sizes and can stay docked',async({page})=>{
 for(const width of [1600,1000,390]){await page.setViewportSize({width,height:900});await expect(page.locator('#live-signal')).toBeVisible();await expect(page.locator('#scope')).toBeVisible();const box=await page.locator('#scope').boundingBox();expect(box.height).toBeGreaterThan(100);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);}
 await page.locator('#dock-signal').click();await page.locator('#cab-ems').scrollIntoViewIfNeeded();await expect(page.locator('#live-signal')).toBeInViewport();await expect(page.locator('#dock-signal')).toHaveAttribute('aria-pressed','true');await page.locator('#dock-signal').click();await expect(page.locator('#live-signal')).not.toHaveClass(/docked/);
});

test('reference lab imports audio locally, renders, measures and exports reproducible files',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const posted=[];page.on('request',r=>{if(r.method()==='POST')posted.push(r.url());});
 await page.goto('/reference.html');await expect(page.locator('.reference-card')).toHaveCount(25);
 const signal=Float32Array.from({length:12000},(_,i)=>.15*Math.sin(2*Math.PI*220*i/24000)*Math.exp(-i/6000));const bytes=Buffer.from(floatWav([signal],24000));
 await page.locator('#reference-file').setInputFiles({name:'test-local.wav',mimeType:'audio/wav',buffer:bytes});await expect(page.locator('#file-info')).toContainText('32-bit float');await expect(page.locator('#file-info')).toContainText('24 kHz original rate');
 await page.locator('#note').fill('57');await page.locator('#render').click();await expect(page.locator('.metric')).toHaveCount(6,{timeout:30000});await expect(page.locator('#play-b')).toBeEnabled();await page.locator('#play-b').click();await expect(page.locator('#status')).toContainText('Playing B');await page.locator('#stop').click();
 const [audio]=await Promise.all([page.waitForEvent('download'),page.locator('#export-audio').click()]);expect(audio.suggestedFilename()).toBe('tonto-reference-candidate.wav');
 const [report]=await Promise.all([page.waitForEvent('download'),page.locator('#export-report').click()]);expect(report.suggestedFilename()).toBe('tonto-reference-report.json');
 await page.locator('#save-studio').click();expect(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('tonto-patches'))).some(k=>k.startsWith('Reference /')))).toBe(true);
 await page.locator('#note').fill('58');await page.locator('#note').blur();await expect(page.locator('#export-report')).toBeDisabled();expect(posted).toEqual([]);expect(errors).toEqual([]);
});

test('reference fit changes only selected controls and can be cancelled',async({page})=>{
 await page.goto('/reference.html');await page.locator('#recipe').selectOption('buchla-ping');const signal=Float32Array.from({length:6000},(_,i)=>.1*Math.sin(2*Math.PI*260*i/12000)*Math.exp(-i/1800));await page.locator('#reference-file').setInputFiles({name:'fit.wav',mimeType:'audio/wav',buffer:Buffer.from(floatWav([signal],12000))});await expect(page.locator('#fit')).toBeEnabled();await page.locator('#fit').click();await expect(page.locator('#fit-result')).toContainText('Fit objective:',{timeout:45000});await expect(page.locator('.metric')).toHaveCount(6);await page.locator('#fit').click();await page.locator('#cancel').click();await expect(page.locator('#status')).toContainText('Cancelled');await expect(page.locator('#render')).toBeEnabled();
});

test('reference catalog filters and cross-cabinet starting patches load in studio',async({page})=>{
 await page.locator('#preset').selectOption('reference:cross-arp-lpg');expect(await page.evaluate(()=>window.studio.engine.routes['buchla.audio'])).toBe('arp.v2pulse');await expect(page.locator('a[href="/reference.html"]')).toHaveAttribute('target','_blank');
 await page.goto('/reference.html');await page.locator('#filter').selectOption('ems');await expect(page.locator('.reference-card')).toHaveCount(3);await page.locator('.reference-card').first().getByRole('button',{name:'Use starting patch'}).click();await expect(page.locator('#recipe')).toHaveValue('ems-sequence');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('browser-decoded recordings retain a source hash without claiming original resolution',async({page})=>{
 await page.goto('/reference.html');
 const data=await page.evaluate(async()=>{const ctx=new AudioContext(),osc=ctx.createOscillator(),dest=ctx.createMediaStreamDestination();osc.connect(dest);osc.start();await ctx.resume();const recorder=new MediaRecorder(dest.stream),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();const start=ctx.currentTime;while(ctx.currentTime-start<.4)await new Promise(r=>setTimeout(r,25));await new Promise(r=>{recorder.onstop=r;recorder.stop();});osc.stop();await ctx.close();return [...new Uint8Array(await new Blob(chunks).arrayBuffer())];});
 await page.locator('#reference-file').setInputFiles({name:'browser-capture.webm',mimeType:'audio/webm',buffer:Buffer.from(data)});await expect(page.locator('#file-info')).toContainText('source bit depth unknown');await expect(page.locator('#file-info')).toContainText('decoded rate');await page.locator('#render').click();await expect(page.locator('.metric')).toHaveCount(6);
});
test('five cabinets, 16x16 matrix and audio start without errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await expect(page.locator('.cabinet')).toHaveCount(7);await expect(page.locator('.matrix-pin')).toHaveCount(256);await page.locator('#power').click();await expect(page.locator('#audio-state')).toHaveText('AUDIO RUNNING');
 await page.evaluate(()=>window.studio.engine.on(60));await page.waitForTimeout(400);
 const rms=await page.evaluate(()=>{const a=new Float32Array(2048);window.studio.engine.analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((n,v)=>n+v*v,0)/a.length);});expect(rms).toBeGreaterThan(.001);expect(errors).toEqual([]);
});
test('microphone cable highlights every input and fans out across cabinets',async({page})=>{
 const count=await page.locator('.jack.input').count();await page.locator('#patch-mic').click();await expect(page.locator('.jack.input.patch-target')).toHaveCount(count);await page.locator('[data-jack="euro.audio"]').click();await page.locator('#patch-mic').click();await page.locator('[data-jack="arp.v1fm"]').click();
 expect(await page.evaluate(()=>window.studio.engine.routes['euro.audio'])).toBe('bridge.mic');expect(await page.evaluate(()=>window.studio.engine.routes['arp.v1fm'])).toBe('bridge.mic');expect(await page.evaluate(()=>window.studio.engine.micStream)).toBeNull();
});
test('drag cable follows pointer, escape cancels, and reverse patching works',async({page})=>{
 const source=page.locator('[data-jack="bridge.mic"]'),target=page.locator('[data-jack="bridge.scaleIn"]');await source.click();await page.mouse.move(500,400);await expect(page.locator('.pending-cable')).toHaveCount(1);await page.keyboard.press('Escape');await expect(page.locator('.pending-cable')).toHaveCount(0);await target.dragTo(source);expect(await page.evaluate(()=>window.studio.engine.routes['bridge.scaleIn'])).toBe('bridge.mic');
});
test('historical inspector fixes adapter, scaling and ground issues',async({page})=>{
 await page.locator('#preset').selectOption('09 / Ground & scale study');await expect(page.locator('#mode')).toHaveValue('historical');const route=page.locator('.route-card').filter({hasText:'Buchla 200 · Pitch CV → Moog 55 · Pitch'});await expect(route.locator('p')).toContainText('adapter');await route.getByLabel('Adapter',{exact:true}).check();await route.getByLabel('Pitch scaler',{exact:true}).check();await page.locator('[data-ground="buchla"]').check();await expect(route.locator('p')).toHaveText('Connected · manual conversion');
});
test('matrix pins, joystick and sequencer change audio state and survive export/import',async({page})=>{
 await page.locator('#pin-strength').selectOption('-1');const pin=page.locator('[data-cell="7:7"]');await pin.click();await expect(pin).toHaveAttribute('data-strength','-1');await page.locator('#joystick').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#joy-readout')).toContainText('X 0.5 V');await page.locator('[data-step="2"]').fill('19');await page.locator('[data-step="2"]').press('Tab');
 const patch=await page.evaluate(()=>window.studio.engine.state);await page.locator('#import-patch').setInputFiles({name:'patch.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(patch))});expect(await page.evaluate(()=>window.studio.engine.state.matrix['7:7'])).toBe(-1);await expect(page.locator('[data-step="2"]')).toHaveValue('19');
});
test('imports existing 2600 patches and rejects malformed files',async({page})=>{
 await page.locator('#import-patch').setInputFiles({name:'2600.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,params:{v1coarse:12,cutoff:777},routes:{ringA:'preamp'}}))});expect(await page.evaluate(()=>window.studio.engine.params['arp.cutoff'])).toBe(777);expect(await page.evaluate(()=>window.studio.engine.routes['arp.ringA'])).toBe('arp.preamp');await page.locator('#import-patch').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});await expect(page.locator('#status')).toContainText('Choose a TONTO or 2600');
});
test('microphone carries real audio into Eurorack, tape records two stems and exports WAV',async({page})=>{
 await page.locator('#preset').selectOption('07 / Voice through grains');await page.locator('#power').click();await page.evaluate(()=>{const ctx=window.studio.engine.ctx,o=ctx.createOscillator(),g=ctx.createGain(),d=ctx.createMediaStreamDestination();o.frequency.value=220;g.gain.value=.2;o.connect(g).connect(d);o.start();navigator.mediaDevices.getUserMedia=async()=>d.stream;});await page.locator('#mic').click();await expect(page.locator('#mic')).toHaveText('Disable mic');await page.locator('#record').click();await page.waitForTimeout(850);await page.locator('#tape-stop').click();await expect(page.locator('.take')).toHaveCount(1);
 const stats=await page.evaluate(()=>{const t=window.studio.tape.takes[0];return {duration:t.wet.duration,channels:t.wet.numberOfChannels,dry:t.dry.numberOfChannels,peak:Math.max(...t.wet.getChannelData(0)),dryPeak:Math.max(...t.dry.getChannelData(0))};});expect(stats.duration).toBeGreaterThan(.4);expect(stats.channels).toBe(2);expect(stats.dry).toBe(1);expect(stats.peak).toBeGreaterThan(.001);expect(stats.dryPeak).toBeGreaterThan(.01);
 const downloadPromise=page.waitForEvent('download');await page.locator('#export-mix').click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('tonto-tape-mix.wav');await page.locator('#mic').click();expect(await page.evaluate(()=>window.studio.engine.routes['euro.audio'])).toBe('bridge.mic');
});
test('save stores complete patches and restores them after reopening',async({page})=>{
 await page.locator('#preset').selectOption('03 / Matrix runner');page.once('dialog',d=>d.accept('Test matrix'));await page.locator('#save-patch').click();await page.reload();await page.locator('#preset').selectOption('user:Test matrix');expect(await page.evaluate(()=>window.studio.engine.state.sequencer)).toBe(true);expect(await page.evaluate(()=>window.studio.engine.state.matrix['8:7'])).toBe(.5);
});
test('desktop and mobile layout stay within viewport',async({page})=>{
 await page.screenshot({path:'test-results/desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});const widths=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));expect(widths.page).toBeLessThanOrEqual(widths.viewport);await page.locator('#help').click();await expect(page.locator('#guide')).toBeVisible();
});
test('knobs drag vertically and keyboard can stay docked while patching',async({page})=>{
 const dial=page.locator('[data-dial="moog.cutoff"]');await dial.scrollIntoViewIfNeeded();const box=await dial.boundingBox();const before=await page.evaluate(()=>window.studio.engine.params['moog.cutoff']);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2-40,{steps:5});await page.mouse.up();expect(await page.evaluate(()=>window.studio.engine.params['moog.cutoff'])).toBeGreaterThan(before);await page.locator('#dock-keys').click();await expect(page.locator('.performance')).toHaveClass(/docked/);await page.locator('#dock-keys').click();await expect(page.locator('.performance')).not.toHaveClass(/docked/);
});

test('three-row sequence plays real audio, manual step/reset work and complete settings survive import',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#preset').selectOption('11 / Three-row sequence');await page.locator('#power').click();await expect.poll(()=>page.locator('#out-meter').evaluate(el=>el.value)).toBeGreaterThan(.005);
 await expect(page.locator('#sequence-position')).toContainText('STEP');await page.locator('#sequence').click();await page.locator('#sequence-reset').click();await expect(page.locator('#sequence-position')).toHaveText('STOPPED · 1');await page.locator('#sequence-step').click();await expect(page.locator('#sequence-position')).toHaveText('STOPPED · 2');
 await page.locator('[data-sequence="length"]').selectOption('5');await page.locator('[data-sequence="direction"]').selectOption('pendulum');await page.locator('[data-sequence="division"]').selectOption('2');await page.locator('[data-sequence="transpose"]').uncheck();await page.locator('[data-row="rowB"][data-index="2"]').fill('-2.3');await page.locator('[data-row="rowB"][data-index="2"]').press('Tab');await page.locator('[data-step-mode="3"]').selectOption('rest');await page.locator('[data-step-mode="4"]').selectOption('skip');await page.locator('[data-param="tools.scale"]').selectOption('2');
 const patch=await page.evaluate(()=>window.studio.engine.state);await page.locator('#preset').selectOption('10 / Empty patch');await page.locator('#import-patch').setInputFiles({name:'sequence.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(patch))});await expect(page.locator('[data-row="rowB"][data-index="2"]')).toHaveValue('-2.3');await expect(page.locator('[data-step-mode="3"]')).toHaveValue('rest');await expect(page.locator('[data-step-mode="4"]')).toHaveValue('skip');await expect(page.locator('[data-sequence="length"]')).toHaveValue('5');await expect(page.locator('[data-sequence="direction"]')).toHaveValue('pendulum');await expect(page.locator('[data-param="tools.scale"]')).toHaveValue('2');expect(await page.evaluate(()=>window.studio.engine.state.sequence)).toEqual(patch.sequence);expect(errors).toEqual([]);
});

test('external clock patch is visible, and all sequence columns are reachable on mobile',async({page})=>{
 await page.locator('#route-source').selectOption('arp.clock');await page.locator('#route-dest').selectOption('tools.seqClock');await page.locator('#connect-route').click();await expect(page.locator('#sequence-clock-note')).toContainText('External clock connected');await page.locator('[data-jack="tools.seqClock"]').click();await expect(page.locator('#sequence-clock-note')).toContainText('Internal clock');
 await page.setViewportSize({width:390,height:844});await page.locator('#cab-tools').scrollIntoViewIfNeeded();await page.locator('[data-row="rowC"][data-index="7"]').fill('4.2');await page.locator('[data-row="rowC"][data-index="7"]').press('Tab');expect(await page.evaluate(()=>window.studio.engine.state.sequence.rowC[7])).toBe(4.2);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
