import {renderPatch,fitPatch} from './reference-render.js';
import {compareAudio} from './reference-audio.js';
self.onmessage=({data:m})=>{
 try{
  if(m.type==='render')self.postMessage({type:'result',audio:renderPatch(m.patch,m.options)});
  if(m.type==='compare')self.postMessage({type:'result',comparison:compareAudio(m.reference,m.candidate,m.rate)});
  if(m.type==='fit')self.postMessage({type:'result',fit:fitPatch(m.reference,m.patch,m.options,m.keys,p=>self.postMessage({type:'progress',...p}))});
 }catch(error){self.postMessage({type:'error',message:error.message});}
};
