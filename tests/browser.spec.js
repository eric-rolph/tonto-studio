import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/');});
test('five cabinets, 16x16 matrix and audio start without errors',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await expect(page.locator('.cabinet')).toHaveCount(6);await expect(page.locator('.matrix-pin')).toHaveCount(256);await page.locator('#power').click();await expect(page.locator('#audio-state')).toHaveText('AUDIO RUNNING');
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
