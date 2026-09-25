import {controls,ports,presets,validatePatch} from './model.js';
import {references} from './reference-catalog.js';
import {referenceRecipes,fitControls} from './reference-recipes.js';
import {readWav,wavInfo,floatWav,rms,onset} from './reference-audio.js';
import {download} from './tape.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let patch=structuredClone(referenceRecipes[0].patch),recipe=referenceRecipes[0],selected=new Set(fitControls.moog),recording=null,candidate=null,comparison=null,lastFit=null,busy=false,worker=null,rejectJob=null,context=null,playing=null,renderOptions=null;
const say=(text,error=false)=>{$('#status').textContent=text;$('#status').classList.toggle('error',error);};
const safe=fn=>async(...args)=>{try{await fn(...args);}catch(e){say(e.message||String(e),true);}};
const finite=(id,min,max)=>{const value=Number($('#'+id).value);if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${$('#'+id).closest('label')?.childNodes[0]?.textContent.trim()||id}: use ${min} to ${max}.`);return value;};
const json=(value,name)=>download(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),name);
const rate=()=>recording?.info.sampleRate||Number($('#rate').value);
function referenceClip(){
 if(!recording)throw new Error('Choose a reference recording first.');
 const start=finite('crop-start',0,recording.info.duration),length=finite('crop-length',.05,12),s=Math.round(start*rate()),n=Math.min(Math.round(length*rate()),recording.channels[0].length-s);
 if(n<rate()*.02)throw new Error('The selected region has less than 20 ms of audio.');
 const channel=$('#channel').value;
 if(channel==='mix')return Float32Array.from({length:n},(_,i)=>recording.channels.reduce((sum,c)=>sum+c[s+i],0)/recording.channels.length);
 return recording.channels[Math.min(Number(channel),recording.channels.length-1)].slice(s,s+n);
}
function options(){return {rate:rate(),note:finite('note',0,127),gate:finite('gate',0,12),duration:finite('duration',.05,12),tap:$('#tap').value};}
function buttons(){
 $('#render').disabled=busy;$('#fit').disabled=busy||!recording;$('#compare-audio').disabled=busy||!recording||!candidate;$('#play-a').disabled=!recording;$('#play-b').disabled=!candidate;$('#export-audio').disabled=busy||!candidate;$('#export-report').disabled=busy||!comparison;
 $('#cancel').hidden=!busy;
 for(const el of $$('#compare input,#compare select,#compare textarea,#save-studio,#export-patch'))el.disabled=busy;
}
function invalidate(clearCandidate=true){stop();comparison=null;lastFit=null;if(clearCandidate)candidate=null;$('#metrics').replaceChildren(Object.assign(document.createElement('p'),{textContent:'Settings changed. Render and measure to update the comparison.'}));$('#fit-result').textContent='';for(const id of ['wave','spectrum','envelope']){const c=$('#'+id);c.getContext('2d').clearRect(0,0,c.width,c.height);}buttons();}
function run(type,data){
 if(busy)throw new Error('Wait for the current measurement or click Cancel.');
 busy=true;buttons();worker=new Worker('/reference-worker.js',{type:'module'});
 return new Promise((resolve,reject)=>{
  const finish=()=>{worker?.terminate();worker=null;rejectJob=null;busy=false;buttons();};
  rejectJob=()=>{finish();reject(new Error('Cancelled. The previous patch is unchanged.'));};
  worker.onerror=e=>{finish();reject(new Error(e.message||'Audio worker failed.'));};
  worker.onmessage=({data:m})=>{
   if(m.type==='progress'){say(`Fitting pass ${m.pass}/3 · ${m.key} · objective ${m.loss.toFixed(3)} (${m.evaluations} renders)`);return;}
   finish();if(m.type==='error')reject(new Error(m.message));else resolve(m);
  };
  worker.postMessage({type,...data});
 });
}
$('#cancel').onclick=()=>rejectJob?.();

function chooseRecipe(id){
 recipe=referenceRecipes.find(r=>r.id===id)||null;
 const studio=id.startsWith('studio:')?presets[Number(id.slice(7))]:null;
 patch=structuredClone(recipe?.patch||studio?.patch||patch);selected=new Set(fitControls[recipe?.family||'moog']);
 $('#recipe-note').textContent=recipe?.description||studio?.note||'Imported patch. Select a cabinet to choose controls.';
 if(recipe){$('#note').value=recipe.note;$('#gate').value=recipe.gate;$('#duration').value=recipe.duration;$('#control-family').value=recipe.family==='mixed'?'moog':recipe.family;}
 $('#tap').value='mix';renderControls();invalidate();
}
for(const r of referenceRecipes)$('#recipe').add(new Option(r.name,r.id));
const group=document.createElement('optgroup');group.label='Studio patches';presets.forEach((p,i)=>group.append(new Option(p.name,'studio:'+i)));$('#recipe').append(group);
for(const p of Object.values(ports))if(p.direction==='output'&&p.kind==='audio')$('#tap').add(new Option(p.id,p.id));
$('#recipe').onchange=()=>chooseRecipe($('#recipe').value);
$('#control-family').onchange=renderControls;
function renderControls(){
 $('#fit-controls').replaceChildren();
 for(const c of Object.values(controls).filter(c=>c.id.startsWith($('#control-family').value+'.'))){
  const row=document.createElement('div');row.className='fit-control';const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=selected.has(c.id);check.disabled=['model','switch','scale','root','processor'].includes(c.unit);check.setAttribute('aria-label','Fit '+c.id);check.onchange=()=>check.checked?selected.add(c.id):selected.delete(c.id);label.append(check,document.createTextNode(c.label+' '+(c.unit||'')));const input=document.createElement('input');input.type='number';input.min=c.min;input.max=c.max;input.step='any';input.value=Number(patch.params[c.id].toPrecision(6));input.setAttribute('aria-label',c.id);input.onchange=()=>{const value=Number(input.value);if(!Number.isFinite(value)||value<c.min||value>c.max){input.value=patch.params[c.id];say(`Use ${c.min} to ${c.max} for ${c.label}.`,true);return;}patch.params[c.id]=value;invalidate();};row.append(label,input);$('#fit-controls').append(row);
 }
}
$('#reference-file').onchange=safe(async e=>{
 const file=e.target.files[0];if(!file)return;if(file.size>100*1024*1024)throw new Error('Use a recording smaller than 100 MB.');
 say('Reading recording locally…');const bytes=await file.arrayBuffer(),info=wavInfo(bytes);let data;
 if(info&&[1,3].includes(info.format))data=readWav(bytes);
 else{const decoder=new OfflineAudioContext(1,1,48000),b=await decoder.decodeAudioData(bytes.slice(0));data={channels:Array.from({length:b.numberOfChannels},(_,i)=>b.getChannelData(i).slice()),info:{sampleRate:b.sampleRate,duration:b.duration,channels:b.numberOfChannels,bits:null,format:'browser-decoded',originalSampleRate:info?.sampleRate||null}};}
 if(data.info.sampleRate<8000||data.info.sampleRate>192000)throw new Error('Use audio sampled between 8 and 192 kHz.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
 recording={...data,name:file.name,bytes:file.size,sha256:hash};$('#file-info').textContent=`${file.name} · ${data.info.bits?data.info.bits+'-bit '+(data.info.format===3?'float':'PCM'):'source bit depth unknown'} · ${data.info.sampleRate/1000} kHz${data.info.bits?' original rate':' decoded rate'} · ${data.info.channels} channel(s) · ${data.info.duration.toFixed(3)} s`;
 $('#crop-start').value=0;$('#crop-length').value=Math.min(12,data.info.duration).toFixed(3);$('#duration').value=Math.min(12,data.info.duration).toFixed(3);$('#channel').value='0';invalidate();say('Reference loaded locally. Set note and gate, then render the patch.');
});
$('#patch-file').onchange=safe(async e=>{const file=e.target.files[0];if(!file)return;if(file.size>300000)throw new Error('Choose a patch smaller than 300 KB.');patch=validatePatch(JSON.parse(await file.text()));recipe=null;$('#recipe').value='';$('#recipe-note').textContent='Imported TONTO patch. Routes and all cabinet controls are retained.';renderControls();invalidate();say('Patch imported.');e.target.value='';});
for(const id of ['note','gate','duration','tap','rate'])$('#'+id).onchange=()=>invalidate();
for(const id of ['crop-start','crop-length','channel'])$('#'+id).onchange=()=>invalidate(false);
$('#render').onclick=safe(async()=>{stop();const o=options();say('Rendering the patch…');const r=await run('render',{patch,options:o});candidate=r.audio;renderOptions=o;comparison=null;lastFit=null;$('#render-info').textContent=`${o.rate/1000} kHz · ${o.duration.toFixed(3)} s · ${o.tap}`;buttons();if(recording)await measure();else say('Patch rendered. Play B to listen.');});
async function measure(){
 if(!candidate)throw new Error('Render the patch first.');say('Comparing waveform, spectrum and envelope…');
 const r=await run('compare',{reference:referenceClip(),candidate,rate:rate()});comparison=r.comparison;drawResults();buttons();say('Comparison ready. Lower errors indicate a closer match on this recording.');
}
$('#compare-audio').onclick=safe(measure);
$('#fit').onclick=safe(async()=>{
 const ref=referenceClip(),o=options(),keys=[...selected];if(o.duration>4||ref.length/o.rate>4)throw new Error('Use a region and render duration of 4 seconds or less for fitting.');if(o.rate>96000)throw new Error('Fitting supports rates up to 96 kHz.');if(keys.length>8)throw new Error('Select no more than eight controls per fit.');
 stop();say('Fitting selected controls…');const r=await run('fit',{reference:ref,patch,options:o,keys});patch=r.fit.patch;candidate=r.fit.audio;renderOptions=o;lastFit={before:r.fit.before,after:r.fit.after,evaluations:r.fit.evaluations,controls:keys};renderControls();await measure();$('#fit-result').textContent=`Fit objective: ${lastFit.before.total.toFixed(3)} → ${lastFit.after.total.toFixed(3)} in ${lastFit.evaluations} renders. These are settings for this clip, not recovered hardware settings.`;
});

function stop(){if(playing){playing.stop();playing.disconnect();playing=null;}}
$('#stop').onclick=stop;
async function play(which){
 stop();if(!context)context=new AudioContext();await context.resume();const ref=recording?referenceClip():null,signal=which==='a'?ref:candidate;if(!signal)throw new Error('Load or render audio first.');
 const gainB=$('#match-level').checked&&ref&&candidate?rms(ref)/Math.max(rms(candidate),1e-12):1;
 let peak=0;for(const x of ref||[])peak=Math.max(peak,Math.abs(x));for(const x of candidate||[])peak=Math.max(peak,Math.abs(x*gainB));const attenuation=Math.min(1,.75/Math.max(peak,1e-8));
 const buffer=context.createBuffer(1,signal.length,rate()),scale=attenuation*(which==='b'?gainB:1);buffer.getChannelData(0).set(Float32Array.from(signal,x=>x*scale));playing=context.createBufferSource();playing.buffer=buffer;playing.connect(context.destination);playing.start();say(`Playing ${which.toUpperCase()}${$('#match-level').checked&&ref&&candidate?' · RMS matched':''}.`);
}
$('#play-a').onclick=safe(()=>play('a'));$('#play-b').onclick=safe(()=>play('b'));
function graph(id,arrays,axis){
 const c=$('#'+id),g=c.getContext('2d'),w=c.width,h=c.height,l=50,r=15,t=12,b=30;g.clearRect(0,0,w,h);g.fillStyle='#121f17';g.fillRect(0,0,w,h);g.font='11px monospace';
 for(let i=0;i<=4;i++){const y=t+(h-t-b)*i/4;g.strokeStyle='#354531';g.beginPath();g.moveTo(l,y);g.lineTo(w-r,y);g.stroke();g.fillStyle='#97aa8b';g.fillText(axis.yLabel(i/4),3,y+4);}
 for(let i=0;i<=4;i++){const x=l+(w-l-r)*i/4;g.fillStyle='#97aa8b';g.textAlign=i===4?'right':i===0?'left':'center';g.fillText(axis.xLabel(i/4),x,h-8);}g.textAlign='left';
 arrays.forEach((a,n)=>{g.strokeStyle=n?'#e4b47d':'#c4dfa0';g.lineWidth=1.4;g.beginPath();for(let i=0;i<a.length;i++){const x=l+axis.x(i,a.length)*(w-l-r),y=t+axis.y(a[i])*(h-t-b);if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();});
}
function drawResults(){
 const m=comparison.metrics,fmt=n=>n==null?'—':n.toFixed(3),entries=[['Waveform error',fmt(m.waveformNrmse)],['Spectrum error',fmt(m.spectralDistance)],['Envelope error',fmt(m.envelopeDistance)],['Correlation',fmt(m.correlation)],['Estimated pitch Δ',m.pitchCents==null?'uncertain':m.pitchCents.toFixed(1)+' ¢'],['Offset',m.lagMs.toFixed(2)+' ms']];
 $('#metrics').replaceChildren();for(const [label,value]of entries){const el=document.createElement('div');el.className='metric';const strong=document.createElement('strong');strong.textContent=value;const span=document.createElement('span');span.textContent=label;el.append(strong,span);$('#metrics').append(el);}
 const sr=m.sampleRate,start=onset(comparison.alignedReference,sr),count=Math.round(sr*.03),a=comparison.alignedReference.slice(start,start+count),b=comparison.alignedCandidate.slice(start,start+count);let max=.01;for(const x of [...a,...b])max=Math.max(max,Math.abs(x));
 graph('wave',[a,b],{x:(i,n)=>i/(n-1),y:v=>.5-v/max*.46,xLabel:v=>(v*30).toFixed(0)+' ms',yLabel:v=>((.5-v)*max*2).toFixed(2)});
 const size=comparison.spectralRef.length*2,upper=sr/2;
 graph('spectrum',[comparison.spectralRef.slice(1),comparison.spectralCandidate.slice(1)],{x:i=>Math.log(1+i)/Math.log(size/2-1),y:v=>1-Math.max(0,Math.min(1,(20*Math.log10(Math.max(v,1e-6))+120)/120)),xLabel:v=>Math.round(sr/size*Math.exp(v*Math.log(size/2-1)))+' Hz',yLabel:v=>Math.round(-v*120)+' dB'});
 let peak=.001;for(const x of [...comparison.envRef,...comparison.envCandidate])peak=Math.max(peak,x);
 graph('envelope',[comparison.envRef,comparison.envCandidate],{x:(i,n)=>i/Math.max(1,n-1),y:v=>1-v/peak,xLabel:v=>(v*comparison.alignedReference.length/sr).toFixed(2)+' s',yLabel:v=>((1-v)*peak).toFixed(2)});
}
$('#export-audio').onclick=safe(()=>{if(!candidate)throw new Error('Render audio first.');download(new Blob([floatWav([candidate],renderOptions.rate)],{type:'audio/wav'}),'tonto-reference-candidate.wav');});
$('#export-patch').onclick=()=>json(patch,'tonto-reference-patch.json');
$('#export-report').onclick=safe(()=>{if(!comparison)throw new Error('Measure a comparison first.');json({version:1,created:new Date().toISOString(),reference:{name:recording.name,sha256:recording.sha256,info:recording.info,region:{start:Number($('#crop-start').value),length:Number($('#crop-length').value),channel:$('#channel').value},notes:$('#source-notes').value},render:renderOptions,metrics:comparison.metrics,fit:lastFit,patch,limits:'Single local clip. Unknown hardware settings are not recovered by fitting. No time stretching. Waveform gain/polarity fitted; spectrum and envelope RMS matched.'},'tonto-reference-report.json');});
$('#save-studio').onclick=safe(()=>{const name='Reference / '+(recipe?.name||'Imported patch');const stored=JSON.parse(localStorage.getItem('tonto-patches')||'{}');const users=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};Object.defineProperty(users,name,{value:validatePatch(patch),enumerable:true,configurable:true,writable:true});localStorage.setItem('tonto-patches',JSON.stringify(users));say(`Saved “${name}”. Select it in the studio’s patch memory.`);});

function catalog(){
 const family=$('#filter').value;$('#reference-list').replaceChildren();
 for(const ref of references.filter(r=>family==='all'||r.family===family)){
  const card=document.createElement('article');card.className='reference-card';const tag=document.createElement('span');tag.className='tag';tag.textContent=ref.family+' / '+ref.source;const title=document.createElement('h3');title.textContent=ref.title;card.append(tag,title);
  for(const [label,key]of [['Hardware','hardware'],['Audio','quality'],['Access','access'],['Patch evidence','patch'],['Use','use']]){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(ref[key]));card.append(p);}
  const links=document.createElement('div');links.className='links';for(const [label,url]of [['Source ↗',ref.url],['Download page ↗',ref.download],['Provenance ↗',ref.evidence]])if(url){const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener';links.append(a);}
  if(ref.recipe){const button=document.createElement('button');button.textContent='Use starting patch';button.onclick=()=>{if(busy){say('Wait for the current job or click Cancel.',true);return;}$('#recipe').value=ref.recipe;chooseRecipe(ref.recipe);$('#source-notes').value=`${ref.title}\n${ref.hardware}\n${ref.url}\n${ref.patch}`;$('#compare').scrollIntoView({behavior:'smooth'});say('Starting patch loaded. It has not been matched to this recording.');};links.append(button);}card.append(links);$('#reference-list').append(card);
 }
}
$('#filter').onchange=catalog;
chooseRecipe(referenceRecipes[0].id);catalog();$('#metrics').textContent='Import a reference and render a patch to measure the differences.';say('Choose a recording or render a starting patch.');
