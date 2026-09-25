// Both traces share the same time window. This only reads the audio graph.
export function setupLiveSignal(engine,root){
 const canvas=root.querySelector('canvas'),context=canvas.getContext('2d');
 const output=new Float32Array(2048),microphone=new Float32Array(2048);
 const windowControl=root.querySelector('#scope-window'),gainControl=root.querySelector('#scope-gain');
 const state=root.querySelector('#scope-state');
 const traces=[
  {data:output,color:'#e7b477',meter:root.querySelector('#out-meter'),readout:root.querySelector('#scope-output-level')},
  {data:microphone,color:'#87bfb2',meter:root.querySelector('#scope-mic-meter'),readout:root.querySelector('#scope-mic-level')},
 ];
 const dock=root.querySelector('#dock-signal');
 dock.onclick=()=>{const on=root.classList.toggle('docked');dock.textContent=on?'Undock':'Dock';dock.setAttribute('aria-pressed',String(on));};
 let width=0,height=0;
 return function drawLiveSignal(){
  const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);
  const nextWidth=Math.round(rect.width*ratio),nextHeight=Math.round(rect.height*ratio);
  if(!nextWidth||!nextHeight)return;
  if(width!==nextWidth||height!==nextHeight){canvas.width=width=nextWidth;canvas.height=height=nextHeight;}
  const running=engine.ctx?.state==='running'&&engine.analyser;
  if(running){engine.analyser.getFloatTimeDomainData(output);engine.micAnalyser.getFloatTimeDomainData(microphone);}
  else{output.fill(0);microphone.fill(0);}
  const rate=engine.ctx?.sampleRate||48000,count=Math.max(2,Math.min(output.length,Math.round(Number(windowControl.value)*rate/1000))),gain=Number(gainControl.value);
  state.textContent=running?`LIVE · ${(count/rate*1000).toFixed(1)} ms`:engine.ctx?'AUDIO SUSPENDED':'AUDIO OFF';
  context.clearRect(0,0,width,height);context.lineWidth=ratio;context.strokeStyle='#81958c24';context.beginPath();
  for(let x=0;x<=width;x+=width/10){context.moveTo(x,0);context.lineTo(x,height);}
  for(let y=0;y<=height;y+=height/6){context.moveTo(0,y);context.lineTo(width,y);}context.stroke();
  for(const trace of traces){
   let peak=0;for(const value of trace.data)peak=Math.max(peak,Math.abs(value));
   trace.meter.value=Math.min(1,peak);trace.readout.textContent=peak>1e-5?`${(20*Math.log10(peak)).toFixed(1)} dBFS`:'−∞ dBFS';
   context.strokeStyle=trace.color;context.lineWidth=1.5*ratio;context.beginPath();
   for(let x=0;x<width;x++){
    const index=trace.data.length-count+Math.floor(x*(count-1)/Math.max(1,width-1));
    const amplitude=Math.max(-1.12,Math.min(1.12,trace.data[index]*gain)),y=height/2-amplitude*height*.42;
    if(x===0)context.moveTo(x,y);else context.lineTo(x,y);
   }
   context.stroke();
  }
 };
}
