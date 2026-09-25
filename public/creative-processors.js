const TAU=2*Math.PI,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// A windowed odd Hilbert FIR and an equally delayed real signal form a
// quadrature pair. Modulation translates frequencies instead of transposing them.
export class FrequencyShifter {
 constructor(rate){this.rate=rate;this.buffer=new Float64Array(127);this.index=0;this.phase=0;this.taps=[];for(let k=0;k<127;k++){const n=k-63;if(n&&Math.abs(n)%2)this.taps.push([k,2/(Math.PI*n)*(.42-.5*Math.cos(TAU*k/126)+.08*Math.cos(2*TAU*k/126))]);}}
 tick(x,hz,mix=1){this.buffer[this.index]=x;let imaginary=0;for(const [k,h]of this.taps)imaginary+=h*this.buffer[(this.index-k+127)%127];const real=this.buffer[(this.index-63+127)%127],wet=real*Math.cos(this.phase)-imaginary*Math.sin(this.phase);this.phase=(this.phase+TAU*clamp(hz,-4000,4000)/this.rate)%TAU;this.index=(this.index+1)%127;return mix?real*(1-mix)+wet*mix:x;}
}
export class Phaser {
 constructor(rate){this.rate=rate;this.phase=0;this.z=new Float64Array(6);this.feedback=0;this.frame=0;this.a=0;}
 tick(x,rate,depth,feedback,mix){if((this.frame++&15)===0){const hz=clamp(650*2**(Math.sin(TAU*this.phase)*depth*3),30,this.rate*.35),g=Math.tan(Math.PI*hz/this.rate);this.a=(1-g)/(1+g);}this.phase=(this.phase+rate/this.rate)%1;let y=x+Math.tanh(this.feedback)*clamp(feedback,-.9,.9);for(let i=0;i<6;i++){const out=-this.a*y+this.z[i];this.z[i]=y+this.a*out;y=out;}this.feedback=y;return x*(1-mix)+.5*(x+y)*mix;}
}
export function quadGains(pan,rear){const x=clamp(pan,-1,1),y=clamp(rear,0,1);return [Math.sqrt((1-x)*.5*(1-y)),Math.sqrt((1+x)*.5*(1-y)),Math.sqrt((1-x)*.5*y),Math.sqrt((1+x)*.5*y)];}
