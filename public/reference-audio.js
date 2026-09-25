// Shared by the browser lab and the offline measurement scripts. No network I/O.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const text=(v,o,n)=>String.fromCharCode(...new Uint8Array(v.buffer,v.byteOffset+o,n));

export function wavInfo(buffer){
 const v=new DataView(buffer);
 if(v.byteLength<12||text(v,0,4)!=='RIFF'||text(v,8,4)!=='WAVE')return null;
 let info=null,data=null;
 for(let p=12;p+8<=v.byteLength;){
  const id=text(v,p,4),n=v.getUint32(p+4,true),o=p+8;
  if(o+n>v.byteLength)throw new Error('The WAV file is truncated.');
  if(id==='fmt '&&n>=16){
   let format=v.getUint16(o,true);
   if(format===65534&&n>=40)format=v.getUint16(o+24,true);
   info={format,channels:v.getUint16(o+2,true),sampleRate:v.getUint32(o+4,true),blockAlign:v.getUint16(o+12,true),bits:v.getUint16(o+14,true)};
  }
  if(id==='data')data={offset:o,bytes:n};
  p=o+n+(n%2);
 }
 if(!info||!data||!info.channels||!info.blockAlign||!info.sampleRate)throw new Error('Missing WAV format or audio data.');
 return {...info,...data,frames:Math.floor(data.bytes/info.blockAlign),duration:data.bytes/info.blockAlign/info.sampleRate};
}

export function readWav(buffer){
 const info=wavInfo(buffer);
 if(!info||![1,3].includes(info.format)||![8,16,24,32].includes(info.bits)||(info.format===3&&info.bits!==32))throw new Error('Use a PCM or 32-bit float WAV file.');
 if(info.blockAlign<info.channels*info.bits/8)throw new Error('Invalid WAV channel layout.');
 const v=new DataView(buffer),channels=Array.from({length:info.channels},()=>new Float32Array(info.frames));
 for(let i=0;i<info.frames;i++)for(let c=0;c<info.channels;c++){
  const o=info.offset+i*info.blockAlign+c*info.bits/8;
  let x=info.format===3?v.getFloat32(o,true):info.bits===8?(v.getUint8(o)-128)/128:info.bits===16?v.getInt16(o,true)/32768:info.bits===32?v.getInt32(o,true)/2147483648:((v.getUint8(o)|v.getUint8(o+1)<<8|v.getUint8(o+2)<<16)<<8>>8)/8388608;
  channels[c][i]=Number.isFinite(x)?x:0;
 }
 return {info,channels};
}

export function floatWav(channels,rate){
 const frames=channels[0]?.length||0,count=channels.length;
 if(!count||channels.some(c=>c.length!==frames))throw new Error('WAV channels must have equal lengths.');
 const buffer=new ArrayBuffer(56+frames*count*4),v=new DataView(buffer);
 const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
 str(0,'RIFF');v.setUint32(4,buffer.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,3,true);v.setUint16(22,count,true);v.setUint32(24,rate,true);v.setUint32(28,rate*count*4,true);v.setUint16(32,count*4,true);v.setUint16(34,32,true);str(36,'fact');v.setUint32(40,4,true);v.setUint32(44,frames,true);str(48,'data');v.setUint32(52,frames*count*4,true);
 for(let i=0;i<frames;i++)for(let c=0;c<count;c++)v.setFloat32(56+(i*count+c)*4,channels[c][i],true);
 return buffer;
}

export function rms(x){let sum=0;for(const v of x)sum+=v*v;return Math.sqrt(sum/Math.max(1,x.length));}
export function onset(x,rate){
 let peak=0;for(const v of x)peak=Math.max(peak,Math.abs(v));
 if(peak<1e-8)return 0;
 const size=Math.max(1,Math.round(rate*.002));
 for(let i=0;i<x.length;i+=size){let energy=0;for(let j=i;j<Math.min(i+size,x.length);j++)energy+=x[j]**2;if(Math.sqrt(energy/size)>peak*.025)return i;}
 return 0;
}

function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len*=2){const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);for(let i=0;i<n;i+=len){let ur=1,ui=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=re[b]*ur-im[b]*ui,ti=re[b]*ui+im[b]*ur;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=ur*wr-ui*wi;ui=ur*wi+ui*wr;ur=next;}}}
}

export function spectrum(x,size=2048){
 const result=new Float64Array(size/2),re=new Float64Array(size),im=new Float64Array(size),hop=size/2;
 let count=0;
 for(let start=0;start<Math.max(1,x.length-size/2);start+=hop){
  for(let i=0;i<size;i++){re[i]=(x[start+i]||0)*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));im[i]=0;}
  fft(re,im);for(let k=0;k<result.length;k++)result[k]+=re[k]**2+im[k]**2;count++;
 }
 for(let k=0;k<result.length;k++)result[k]=Math.sqrt(result[k]/count)/size;
 return result;
}

export function envelope(x,rate){
 const size=Math.max(1,Math.round(rate*.005)),out=new Float64Array(Math.ceil(x.length/size));
 for(let i=0;i<out.length;i++){let e=0;for(let j=i*size;j<Math.min(x.length,(i+1)*size);j++)e+=x[j]**2;out[i]=Math.sqrt(e/size);}
 return out;
}

function padShift(x,offset,length){return Float32Array.from({length},(_,i)=>x[i+offset]||0);}
function distance(a,b){let error=0,power=0;for(let i=0;i<Math.max(a.length,b.length);i++){error+=((a[i]||0)-(b[i]||0))**2;power+=(a[i]||0)**2;}return Math.sqrt(error/Math.max(power,1e-20));}

// This objective ignores oscillator phase, but retains absolute pitch and decay time.
export function features(x,rate){const start=onset(x,rate);x=x.slice(start);const level=rms(x);return {spectrum:spectrum(x),envelope:envelope(x,rate),rms:level,start};}
export function featureLoss(ref,candidate){
 if(candidate.rms<1e-7)return {spectral:Infinity,envelope:Infinity,total:Infinity};
 const gain=ref.rms/Math.max(candidate.rms,1e-12),scaled=a=>Float64Array.from(a,v=>v*gain);
 const spectral=distance(ref.spectrum,scaled(candidate.spectrum)),env=distance(ref.envelope,scaled(candidate.envelope));
 return {spectral,envelope:env,total:spectral+.65*env};
}

export function pitchEstimate(x,rate){
 // Estimate on the strongest 85 ms window, with a minimum of three cycles at 40 Hz.
 const length=Math.min(x.length,Math.round(rate*.085));if(length<128||rms(x)<1e-7)return null;
 let start=0,bestEnergy=-1;for(let s=0;s+length<=x.length;s+=Math.max(1,length>>1)){let e=0;for(let i=s;i<s+length;i++)e+=x[i]**2;if(e>bestEnergy){bestEnergy=e;start=s;}}
 const min=Math.max(2,Math.floor(rate/2000)),max=Math.min(Math.floor(rate/40),Math.floor(length/2));
 const scores=new Float64Array(max+1);let best=0,lag=0;
 for(let k=min;k<=max;k++){let cross=0,a=0,b=0;for(let i=0;i<length-k;i++){const r=x[start+i],c=x[start+i+k];cross+=r*c;a+=r*r;b+=c*c;}scores[k]=cross/Math.sqrt(Math.max(1e-20,a*b));}
 for(let k=min+1;k<max;k++)if(scores[k]>scores[k-1]&&scores[k]>=scores[k+1]&&scores[k]>best){best=scores[k];lag=k;}
 // Prefer the first strong peak to a multiple of the period.
 for(let k=min+1;k<lag;k++)if(scores[k]>Math.max(.8,best*.98)&&scores[k]>scores[k-1]&&scores[k]>=scores[k+1]){lag=k;best=scores[k];break;}
 if(best<.65||!lag)return null;
 const denom=scores[lag-1]-2*best+scores[lag+1],delta=denom?clamp(.5*(scores[lag-1]-scores[lag+1])/denom,-.5,.5):0;
 return {hz:rate/(lag+delta),confidence:best};
}

export function compareAudio(reference,candidate,rate){
 if(rms(reference)<1e-7||rms(candidate)<1e-7)throw new Error('Both recordings must contain audible signal.');
 const refStart=onset(reference,rate),candStart=onset(candidate,rate),coarse=candStart-refStart,window=Math.min(Math.round(rate*.25),reference.length-refStart),radius=Math.round(rate*.015);
 let best=-1,lag=coarse;
 // Onset alignment followed by a bounded ±15 ms sample-lag search. No time stretching.
 for(let d=coarse-radius;d<=coarse+radius;d++){
  let cross=0,a=0,b=0;
  for(let i=refStart;i<refStart+window;i+=2){const r=reference[i],c=candidate[i+d]||0;cross+=r*c;a+=r*r;b+=c*c;}
  const score=Math.abs(cross)/Math.sqrt(Math.max(1e-20,a*b));if(score>best){best=score;lag=d;}
 }
 const first=Math.min(0,-lag),length=Math.max(reference.length,candidate.length-lag)-first;
 const r=padShift(reference,first,length),c=padShift(candidate,first+lag,length);
 let cross=0,rr=0,cc=0;for(let i=0;i<length;i++){cross+=r[i]*c[i];rr+=r[i]**2;cc+=c[i]**2;}
 const rmsGain=Math.sqrt(rr/cc),waveGain=cross/cc,aligned=Float32Array.from(c,v=>v*waveGain),matched=Float32Array.from(c,v=>v*rmsGain);
 const spectralRef=spectrum(r),spectralCandidate=spectrum(matched),envRef=envelope(r,rate),envCandidate=envelope(matched,rate);
 const refPitch=pitchEstimate(reference,rate),candPitch=pitchEstimate(candidate,rate);
 return {metrics:{sampleRate:rate,referenceSeconds:reference.length/rate,candidateSeconds:candidate.length/rate,lagSamples:lag,lagMs:lag/rate*1000,alignment:'2 ms onset / ±15 ms local correlation; no time stretching',correlation:cross/Math.sqrt(rr*cc),waveformNrmse:distance(r,aligned),waveGain,rmsGain,spectralDistance:distance(spectralRef,spectralCandidate),envelopeDistance:distance(envRef,envCandidate),referencePitch:refPitch,candidatePitch:candPitch,pitchCents:refPitch&&candPitch?1200*Math.log2(candPitch.hz/refPitch.hz):null,referenceRms:rms(reference),candidateRms:rms(candidate)},alignedReference:r,alignedCandidate:aligned,spectralRef,spectralCandidate,envRef,envCandidate};
}
