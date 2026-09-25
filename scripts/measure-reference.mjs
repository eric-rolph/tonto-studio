// Reproduce the published Easel study using a local, independently obtained WAV.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,relative,sep,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readWav,compareAudio,floatWav} from '../public/reference-audio.js';
import {renderPatch,fitPatch} from '../public/reference-render.js';
const [file,output,flag]=process.argv.slice(2);
if(!file||!output)throw new Error('Usage: node scripts/measure-reference.mjs <Cosmic Clay 2_bip.wav> <output-folder-outside-repo> [--refit]');
const repo=resolve(fileURLToPath(new URL('..',import.meta.url))),destination=resolve(output);
// Never write reference recordings or rendered WAVs into the publish directory.
const rel=relative(repo,destination);
if(!rel||(!isAbsolute(rel)&&rel.split(sep)[0]!=='..'))throw new Error('Choose an output folder outside this repository.');
const bytes=readFileSync(file),saved=JSON.parse(readFileSync(new URL('../public/reference-easel-report.json',import.meta.url))),hash=createHash('sha256').update(bytes).digest('hex');
if(hash!==saved.source.sha256)throw new Error('This is not the exact source file used in the published comparison (SHA-256 differs).');
const {info,channels}=readWav(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)),reference=channels[0],options=saved.options;
const before=compareAudio(reference,renderPatch(saved.baselinePatch,options),info.sampleRate).metrics;
const fit=flag==='--refit'?fitPatch(reference,saved.baselinePatch,options,saved.fitControls,p=>console.log(`Pass ${p.pass}: ${p.key} / loss ${p.loss.toFixed(4)}`),5):null;
const patch=fit?.patch||saved.patch,audio=fit?.audio||renderPatch(patch,options),after=compareAudio(reference,audio,info.sampleRate).metrics;
mkdirSync(destination,{recursive:true});
writeFileSync(join(destination,'easel-measurement.json'),JSON.stringify({...saved,before,after,patch,refit:fit?{before:fit.before,after:fit.after,evaluations:fit.evaluations}:null},null,2));
writeFileSync(join(destination,'easel-candidate.wav'),new Uint8Array(floatWav([audio],info.sampleRate)));
console.log(JSON.stringify({before,after},null,2));
