import {test,expect} from '@playwright/test';

test('patch and tape imports open from the keyboard',async({page})=>{
 await page.goto('/');
 for(const id of ['import-patch','import-audio']){
  const chooser=page.waitForEvent('filechooser');await page.locator(`[data-file-for="${id}"]`).press('Enter');
  const file=await chooser;expect(await file.element().getAttribute('id')).toBe(id);await file.setFiles([]);
 }
});

test('rack navigation stays visible, follows the rack, and leaves headings unobscured',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.locator('.rack-nav a[href="#cab-buchla"]').click();await expect(page.locator('.rack-nav a[href="#cab-buchla"]')).toHaveAttribute('aria-current','location');
 const positions=await page.evaluate(()=>({nav:document.querySelector('.rack-nav').getBoundingClientRect().toJSON(),cab:document.querySelector('#cab-buchla').getBoundingClientRect().toJSON()}));expect(positions.nav.top).toBeLessThanOrEqual(1);expect(positions.cab.top).toBeGreaterThanOrEqual(positions.nav.bottom);
 await page.locator('#cab-fx').evaluate(el=>el.scrollIntoView({block:'start'}));await expect(page.locator('.rack-nav a[href="#cab-fx"]')).toHaveAttribute('aria-current','location');
 await page.setViewportSize({width:390,height:844});await page.locator('.rack-nav a[href="#tape"]').click();await expect(page.locator('.rack-nav a[href="#tape"]')).toHaveAttribute('aria-current','location');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('reference audio and patch pickers can both be opened with the keyboard',async({page})=>{
 await page.goto('/reference.html');
 for(const id of ['reference-file','patch-file']){const chooser=page.waitForEvent('filechooser');await page.locator(`[data-file-for="${id}"]`).press('Enter');const file=await chooser;expect(await file.element().getAttribute('id')).toBe(id);await file.setFiles([]);}
});
