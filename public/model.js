import {defaults as arpDefaults, sources as arpSources, destinations as arpInputs, presets as arpPresets} from './arp/model.js';
import {sequenceDefaults,validateSequence} from './sequencer.js';
import {bandFrequencies} from './spectral.js';

export const families = {
  bridge:{name:'Master console',connector:'mini',pitch:1},
  fx:{name:'Spectral studio',connector:'mini',pitch:1},
  tools:{name:'Sequencer & utilities',connector:'mini',pitch:1},
  moog:{name:'Moog 55',connector:'phone',pitch:1},
  buchla:{name:'Buchla 200',connector:'banana',pitch:1.2},
  arp:{name:'ARP 2600',connector:'mini',pitch:1},
  ems:{name:'EMS VCS3',connector:'pin',pitch:1},
  euro:{name:'Eurorack',connector:'mini',pitch:1},
};
export const controls = {};
function c(id,label,value,min=0,max=1,unit='',log=false){controls[id]={id,label,value,min,max,unit,log};return id;}
const group=(title,...ids)=>({title,ids});
export const panels = {
 fx:[
  group('Fixed filter bank',c('fx.lowBand','Low <88',.6,0,2,'×'),...bandFrequencies.map((hz,i)=>c('fx.band'+i,hz>=1000?(hz/1000)+' kHz':hz+' Hz',.6,0,2,'×')),c('fx.highBand','High >8k',.6,0,2,'×')),
  group('Multimode filter',c('fx.cutoff','Cutoff',1200,20,16000,'Hz',true),c('fx.q','Resonance Q',.7071,.5,8,'×')),
  group('Twelve-band vocoder',c('fx.sensitivity','Sensitivity',6,.2,30,'×',true),c('fx.release','Release',.08,.01,1,'s',true),c('fx.formant','Formant shift',0,-12,12,'st'),c('fx.monitor','Monitor',0,0,4,'processor')),
 ],
 tools:[
  group('DC mixer / attenuverters',c('tools.mix1','Input 1',1,-2,2,'×'),c('tools.mix2','Input 2',1,-2,2,'×'),c('tools.mix3','Input 3',1,-2,2,'×'),c('tools.offset','Offset',0,-5,5,'V')),
  group('Dual linear VCA',c('tools.gainA','A initial',0),c('tools.gainB','B initial',0)),
  group('Rise / fall function',c('tools.rise','Rise',.01,.001,5,'s',true),c('tools.fall','Fall',.25,.001,8,'s',true),c('tools.cycle','Cycle',0,0,1,'switch')),
  group('Pitch quantizer',c('tools.scale','Scale',0,0,3,'scale'),c('tools.root','Root',0,0,11,'root')),
  group('Slew / portamento',c('tools.slewRise','Rise / volt',.05,.001,4,'s',true),c('tools.slewFall','Fall / volt',.05,.001,4,'s',true)),
 ],
 moog:[
  group('921 · oscillator bank',c('moog.tune','Tune',-12,-36,36,'st'),c('moog.detune','Beat',4,-30,30,'ct'),c('moog.wave','Saw / pulse',0),c('moog.pw','Pulse width',.5,.05,.95),c('moog.fm','FM amount',.05,0,3,'V')),
  group('Mixer / 904A · ladder',c('moog.mixA','Osc A',.55),c('moog.mixB','Osc B',.3),c('moog.mixSub','Sub',.15),c('moog.cutoff','Cutoff',650,30,14000,'Hz',true),c('moog.res','Resonance',.35,0,.97),c('moog.drive','Drive',.25),c('moog.depth','Env amount',3,-4,6,'V')),
  group('911 · envelope / VCA',c('moog.attack','Attack',.015,.001,4,'s',true),c('moog.decay','Decay',.3,.01,4,'s',true),c('moog.sustain','Sustain',.4),c('moog.release','Release',.2,.01,6,'s',true),c('moog.initial','Initial gain',0)),
 ],
 buchla:[
  group('259 · complex oscillator',c('buchla.tune','Tune',0,-36,36,'st'),c('buchla.ratio','Mod ratio',2,.1,12,'×'),c('buchla.fm','FM index',.7,0,6),c('buchla.fold','Fold',1.8,1,8,'×'),c('buchla.symmetry','Symmetry',0,-1,1)),
  group('281 · function',c('buchla.attack','Rise',.01,.001,3,'s',true),c('buchla.decay','Fall',.45,.02,5,'s',true),c('buchla.cycle','Cycle',0,0,1,'switch')),
  group('292 · low-pass gate',c('buchla.color','Brightness',.65),c('buchla.vactrol','Vactrol tail',.35,.03,2,'s',true),c('buchla.initial','Open',0)),
 ],
 ems:[
  group('Oscillators / diode filter',c('ems.tune','Osc 1 tune',0,-36,36,'st'),c('ems.detune','Osc 2 offset',7,-24,24,'st'),c('ems.lfo','Osc 3 rate',2,.03,40,'Hz',true),c('ems.cutoff','Cutoff',1100,30,14000,'Hz',true),c('ems.res','Resonance',.45,0,.96)),
  group('Trapezoid / output',c('ems.attack','Attack',.01,.001,3,'s',true),c('ems.on','On',.08,.005,3,'s',true),c('ems.decay','Decay',.2,.01,4,'s',true),c('ems.off','Off',.1,.005,3,'s',true),c('ems.cycle','Repeat',0,0,1,'switch'),c('ems.reverb','Spring',.2)),
 ],
 euro:[
  group('Macro voice',c('euro.tune','Tune',0,-36,36,'st'),c('euro.model','Model',0,0,2,'model'),c('euro.timbre','Timbre',.4),c('euro.morph','Morph',.3),c('euro.decay','Decay',.4,.02,4,'s',true)),
  group('Resonator / grains',c('euro.damping','Damping',.6),c('euro.resonator','Resonator',.35),c('euro.grain','Grain mix',.25),c('euro.size','Grain size',.12,.025,.5,'s',true),c('euro.rate','Grain pitch',1,.25,4,'×'),c('euro.freeze','Freeze',0,0,1,'switch')),
 ],
 bridge:[
  group('Mic / envelope follower',c('bridge.micGain','Mic gain',2,.1,30,'×',true),c('bridge.followGain','Env gain',3,.1,10,'×'),c('bridge.followRelease','Env release',.15,.01,2,'s',true)),
  group('Precision scaler / inverter',c('bridge.scale','Scale',.833333,-2,2,'×'),c('bridge.bias','Offset',0,-5,5,'V'),c('bridge.lfo','LFO',3,.03,30,'Hz',true)),
 ]
};
// The 2600 keeps its original parameter names and full port surface.
const arpLimits={cutoff:[20,18000,'Hz',true],attack:[.001,5,'s',true],decay:[.005,8,'s',true],release:[.005,10,'s',true],arAttack:[.001,5,'s',true],arRelease:[.005,10,'s',true],preamp:[.1,30,'×',true],efGain:[.1,10,'×'],efAttack:[.001,.2,'s',true],efRelease:[.01,2,'s',true],clock:[.2,30,'Hz',true],lag:[.001,2,'s',true],offset:[-5,5,'V'],procA:[-1,1,'×'],procB:[-1,1,'×'],filterEnv:[-4,6,'V'],filterFM:[0,3,'V'],pan:[-1,1],shLevel:[0,4,'V'],glide:[0,2,'s'],vibratoRate:[.1,20,'Hz'],bend:[-2,2,'st'],octave:[-3,3,'st']};
for(const [key,value] of Object.entries(arpDefaults)){
 let limits=arpLimits[key]||(/coarse/.test(key)?[-48,48,'st']:/fine/.test(key)?[-100,100,'ct']:/fm$/.test(key)?[0,3,'V']:/pw$/.test(key)?[.03,.97]:[0,1]);
 c('arp.'+key,key.replace(/([A-Z])/g,' $1').replace(/^v([123])/,'VCO $1 '),value,...limits);
}
panels.arp=[group('VCO 1 / 2 / 3',...['v1coarse','v1level','v2coarse','v2level','v3coarse','v3level','v2pwm'].map(k=>'arp.'+k)),group('VCF / amplifier',...['cutoff','resonance','filterEnv','ringLevel','micLevel','vcaInitial','reverb'].map(k=>'arp.'+k)),group('ADSR / preamp',...['attack','decay','sustain','release','preamp','efGain'].map(k=>'arp.'+k))];
for(const family of ['moog','buchla','arp','ems','euro','fx']){c(family+'.level','Level',family==='moog'?.65:0);c(family+'.pan','Pan',0,-1,1);}
c('master','Master',.6);c('tempo','Tempo',108,35,220,'BPM');c('swing','Swing',0,0,.45);c('expression','Expression',0);c('bend','Pitch bend',0,-2,2,'st');c('octave','Octave',0,-3,3,'st');c('joyX','X',0,-1,1);c('joyY','Y',0,-1,1);c('mains','Mains',60,50,60,'Hz');
export const defaults=Object.fromEntries(Object.values(controls).map(p=>[p.id,p.value]));
export const ports={};
function port(id,name,direction,kind='audio',normal=null,extra={}){const family=id.split('.')[0],f=families[family];ports[id]={id,name,direction,kind,family,connector:family==='buchla'&&kind==='audio'?'mini':f.connector,voltsPerOct:f.pitch,trigger:family==='moog'?'s':'v',amplitude:family==='buchla'?10:5,impedance:direction==='input'?100000:1000,normal,...extra};}
const out=(id,name,kind='audio',extra={})=>port(id,name,'output',kind,null,extra);
const input=(id,name,kind='audio',normal=null,extra={})=>port(id,name,'input',kind,normal,extra);
out('bridge.mic','MIC OUT');out('bridge.env','MIC ENV','cv');out('bridge.pitch','Keyboard CV','pitch');out('bridge.gate','Keyboard gate','gate');out('bridge.velocity','Velocity','cv');out('bridge.expression','Expression','cv');out('bridge.seq','Row A · pitch','pitch');out('bridge.clock','Sequence gate','gate');out('bridge.lfoOut','LFO','cv');out('bridge.scaleOut','Scaled CV','cv');out('bridge.strig','S-Trig','gate',{trigger:'s',connector:'phone'});out('bridge.vtrig','V-Trig','gate');out('bridge.mix','Mixer out');out('bridge.noise','Noise');
input('bridge.scaleIn','Scaler input','cv','bridge.pitch');input('bridge.triggerIn','Trigger converter','gate','bridge.gate');
out('tools.rowB','Row B','cv');out('tools.rowC','Row C','cv');out('tools.pulse','Clock pulse','gate');
input('tools.seqClock','Sequence clock','gate');input('tools.reset','Reset sequence / dividers','gate');
input('tools.clockIn','Divider clock','gate','tools.pulse');
for(const d of [2,4,8])out('tools.div'+d,'Clock ÷'+d,'gate');
input('tools.switchClock','Switch advance','gate','tools.div2');
for(let i=1;i<=3;i++){input('tools.switch'+i,'Switch '+i,'cv',i===1?'bridge.seq':i===2?'tools.rowB':'tools.rowC');input('tools.mix'+i,'Mix '+i,'cv');}
out('tools.switchOut','Switch out','cv');out('tools.mixOut','Mix out','cv');
input('tools.functionGate','Function trigger','gate','bridge.clock');out('tools.function','Function','cv');out('tools.end','End of cycle','gate');
for(const channel of ['A','B']){input('tools.vca'+channel+'In','VCA '+channel+' signal');input('tools.vca'+channel+'CV','VCA '+channel+' CV','cv','tools.function');out('tools.vca'+channel,'VCA '+channel+' out');}
input('tools.quantizeIn','Quantizer in','pitch','bridge.seq');out('tools.quantized','Quantized CV','pitch');input('tools.slewIn','Slew in','pitch','tools.quantized');out('tools.slew','Slew out','pitch');
for(const family of ['moog','buchla','ems','euro']){out(family+'.pitchOut','Pitch CV','pitch');out(family+'.gateOut','Gate out','gate');out(family+'.out','Audio out');input(family+'.pitch','Pitch','pitch','bridge.pitch');}
for(const [id,name,kind]of [['oscA','Saw A','audio'],['oscB','Pulse B','audio'],['sub','Sub','audio'],['filter','VCF out','audio'],['env','Envelope','cv']])out('moog.'+id,name,kind);
input('moog.gate','S-Trig in','gate','bridge.gate');input('moog.fmIn','Oscillator FM','cv');input('moog.audio','Filter audio','audio');input('moog.cutCV','Filter CV','cv','moog.env');input('moog.amp','VCA audio','audio','moog.filter');input('moog.ampCV','VCA CV','cv','moog.env');
out('buchla.complex','Complex out');out('buchla.mod','Mod oscillator');out('buchla.function','Function','cv');input('buchla.gate','Pulse in','gate','bridge.gate');input('buchla.fmIn','FM','cv');input('buchla.foldIn','Fold CV','cv');input('buchla.audio','LPG audio','audio','buchla.complex');input('buchla.lpgCV','LPG CV','cv','buchla.function');
for(const [id,name]of arpSources){const kind=id.startsWith('keyboard')?'pitch':['gate','clock'].includes(id)?'gate':['adsr','ar','ef','sh','processor','lag','lfo'].includes(id)?'cv':'audio';out('arp.'+id,name,kind);}
out('arp.out','Stereo mix');
for(const [id,name,n]of arpInputs){const kind=/pitch|Pitch/.test(id)?'pitch':/Gate|Clock/.test(id)?'gate':/fm|FM|pwm|Env|CV|AR|proc|lag/.test(id)?'cv':'audio';input('arp.'+id,name,kind,'arp.'+n);}
export const matrixSources=['ems.osc1','ems.osc2','ems.osc3','bridge.noise','ems.filter','ems.env','ems.ring','ems.x','ems.y','bridge.mic','bridge.seq','bridge.clock','bridge.lfoOut','moog.out','buchla.out','euro.out'];
export const matrixDestinations=['ems.pitch','ems.fm1','ems.pitch2','ems.fm2','ems.pitch3','ems.fm3','ems.audio','ems.cutCV','ems.amp','ems.ampCV','ems.gate','ems.ringA','ems.ringB','ems.springIn','ems.panCV','ems.feedback'];
export const matrixLabels=['Pitch 1','FM 1','Pitch 2','FM 2','Pitch 3','FM 3','Filter in','Filter CV','VCA in','VCA CV','Gate','Ring A','Ring B','Spring in','Pan CV','Feedback'];
for(const [i,id]of matrixDestinations.entries())if(!ports[id])input(id,matrixLabels[i],/pitch/.test(id)?'pitch':/gate/.test(id)?'gate':['ems.audio','ems.amp','ems.ringA','ems.ringB','ems.springIn','ems.feedback'].includes(id)?'audio':'cv');
for(const [id,name,kind]of [['osc1','Oscillator 1','audio'],['osc2','Oscillator 2','audio'],['osc3','Oscillator 3','cv'],['filter','Filter','audio'],['env','Trapezoid','cv'],['ring','Ring','audio'],['x','Joystick X','cv'],['y','Joystick Y','cv']])out('ems.'+id,name,kind);
out('euro.voice','Macro out');out('euro.resonated','Resonator out');out('euro.grains','Grains out');input('euro.gate','Trigger','gate','bridge.gate');input('euro.timbreIn','Timbre CV','cv');input('euro.audio','Resonator in','audio','euro.voice');input('euro.grainIn','Grain input','audio','euro.resonated');
input('fx.audio','Filter audio','audio','moog.out');input('fx.cutCV','Cutoff CV','cv');input('fx.modulator','Vocoder modulator','audio','bridge.mic');input('fx.carrier','Vocoder carrier','audio','moog.oscA');input('fx.formantCV','Formant CV','cv');
for(const [id,label]of [['bank','Filter bank'],['low','Low-pass'],['band','Band-pass'],['high','High-pass'],['vocoder','Vocoder'],['out','Monitor out']])out('fx.'+id,label);
export const initialMatrix={'0:6':1,'1:6':.5,'4:8':1,'5:9':1,'11:10':1,'10:0':1,'10:2':1};
export function freshPatch(){return {version:1,params:{...defaults},routes:{},cables:{},matrix:{...initialMatrix},mode:'modern',grounds:{bridge:true,tools:true,fx:true,moog:true,buchla:true,arp:true,ems:true,euro:true},steps:[0,7,12,3,10,7,14,5],sequence:sequenceDefaults(),sequencer:false};}
export function validatePatch(raw){
 if(!raw||raw.version!==1||!raw.params||typeof raw.params!=='object')throw new Error('Choose a TONTO Studio patch file.');
 const p=freshPatch();
 for(const [k,v]of Object.entries(raw.params)){const cfg=Object.hasOwn(controls,k)?controls[k]:null;if(cfg&&Number.isFinite(v))p.params[k]=Math.min(cfg.max,Math.max(cfg.min,v));}
 p.mode=raw.mode==='historical'?'historical':'modern';
 for(const [d,s]of Object.entries(raw.routes||{}))if(ports[d]?.direction==='input'&&ports[s]?.direction==='output'){p.routes[d]=s;const c=raw.cables?.[d]||{};p.cables[d]={adapter:c.adapter===true,scale:c.scale===true,trigger:c.trigger===true,gain:Number.isFinite(c.gain)?Math.max(-2,Math.min(2,c.gain)):1};}
 if(raw.matrix&&typeof raw.matrix==='object'){p.matrix={};for(const [k,v]of Object.entries(raw.matrix)){const [r,c]=k.split(':').map(Number);if(Number.isInteger(r)&&r>=0&&r<16&&Number.isInteger(c)&&c>=0&&c<16&&[-1,.5,1].includes(v))p.matrix[k]=v;}}
 for(const f of Object.keys(p.grounds))if(typeof raw.grounds?.[f]==='boolean')p.grounds[f]=raw.grounds[f];
 if(Array.isArray(raw.steps)&&raw.steps.length===8&&raw.steps.every(Number.isFinite))p.steps=raw.steps.map(v=>Math.round(Math.max(-24,Math.min(24,v))));
 p.sequence=validateSequence(raw.sequence||{});p.sequencer=raw.sequencer===true;return p;
}
const scene=(name,note,params={},routes={},extra={})=>({name,note,patch:validatePatch({...freshPatch(),params:{...defaults,...params},routes,...extra})});
export const presets=[
 scene('01 / Living bass','Play the keyboard. The ARP pulse oscillator feeds the Moog ladder filter. Expression opens the filter.',{'arp.v2coarse':-12,'moog.cutoff':240,'moog.depth':3.8,'moog.attack':.025,'moog.decay':.35,'moog.sustain':.2},{'moog.audio':'arp.v2pulse'}),
 scene('02 / West coast cycles','A cycling function strikes the low-pass gate. Change the fold amount and modulation ratio.',{'moog.level':0,'buchla.level':.7,'buchla.cycle':1,'buchla.fm':1.4,'buchla.fold':2.3}),
 scene('03 / Matrix runner','Start the sequence. Move the joystick to sweep the diode filter. The pins show the signal path.',{'moog.level':0,'ems.level':.7,'ems.cutoff':900,'ems.res':.65,'tempo':142},{},{sequencer:true,matrix:{...initialMatrix,'8:7':.5}}),
 scene('04 / Voice & circuit','Enable your microphone. Your voice drives the ARP ring modulator and envelope follower.',{'moog.level':0,'arp.level':.7,...Object.fromEntries(Object.entries(arpPresets['Droid · voice + circuit'].params).map(([k,v])=>['arp.'+k,v]))},Object.fromEntries(Object.entries(arpPresets['Droid · voice + circuit'].routes).map(([k,v])=>['arp.'+k,'arp.'+v]))),
 scene('05 / Resonant fragments','Play short notes. The resonator feeds overlapping grains; freeze holds the recent buffer.',{'moog.level':0,'euro.level':.75,'euro.model':1,'euro.grain':.6,'euro.resonator':.65}),
 scene('06 / Cross-cabinet lead','Play a note. The Buchla complex oscillator runs through the Moog ladder and envelope.',{'moog.level':.65,'moog.tune':0,'moog.cutoff':1300,'buchla.fm':.35,'buchla.fold':1.5},{'moog.audio':'buchla.complex'}),
 scene('07 / Voice through grains','Enable the microphone. MIC OUT excites the resonator, then enters the grain buffer.',{'moog.level':0,'euro.level':.75,'euro.grain':.7,'euro.resonator':.8},{'euro.audio':'bridge.mic','euro.grainIn':'euro.resonated'}),
 scene('08 / ARP warm ensemble','The original 2600 signal path, with three detuned oscillators and spring reverb.',{'moog.level':0,'arp.level':.7,...Object.fromEntries(Object.entries(arpPresets['Warm · three oscillators'].params).map(([k,v])=>['arp.'+k,v]))},{'arp.filter2':'arp.v2saw'}),
 scene('09 / Ground & scale study','Historical mode: play the keyboard, then fit an adapter, pitch scaler, and ground bond in the cable inspector.',{'moog.level':.7},{'moog.pitch':'buchla.pitchOut','moog.gate':'bridge.strig'},{mode:'historical',grounds:{moog:true,buchla:false,arp:true,ems:true,euro:true},cables:{'moog.gate':{adapter:true}}}),
 scene('10 / Empty patch','All cabinet faders are down. Start with an oscillator output, then patch it through a filter and amplifier.',{'moog.level':0}),
 scene('11 / Three-row sequence','Start audio. Row A plays the Moog; B moves the cutoff and C controls a separate VCA. Change rows and step modes in Sequencer & utilities.',{'moog.level':.65,'moog.tune':-12,'moog.cutoff':350,'moog.depth':3,'moog.initial':0,'tools.gainA':0,'tempo':112},{'moog.pitch':'bridge.seq','moog.gate':'bridge.clock','moog.cutCV':'tools.rowB','tools.vcaAIn':'moog.filter','tools.vcaACV':'tools.rowC','moog.amp':'tools.vcaA','moog.ampCV':'tools.function'},{sequencer:true}),
 scene('12 / Divided cabinet duet','Start audio. The Moog plays each step; the Buchla strikes every fourth clock. Both follow Row A, with automatic pitch and trigger conversion.',{'moog.level':.5,'buchla.level':.45,'moog.cutoff':500,'buchla.fm':.4,'buchla.fold':1.4,'buchla.decay':.55,'tempo':102},{'moog.pitch':'bridge.seq','moog.gate':'bridge.clock','buchla.pitch':'bridge.seq','buchla.gate':'tools.div4'},{sequencer:true,sequence:{...sequenceDefaults(),modes:['play','rest','play','play','play','rest','play','rest']}}),
 scene('13 / Switched voltage melody','Start audio. The three-way switch chooses pitch voltages from A, B and C. The quantizer keeps them in C minor; slew adds portamento.',{'moog.level':.6,'moog.tune':-12,'tools.scale':2,'tools.slewRise':.08,'tools.slewFall':.12,'tempo':84},{'tools.quantizeIn':'tools.switchOut','moog.pitch':'tools.slew','moog.gate':'bridge.clock'},{sequencer:true,sequence:{...sequenceDefaults(),rowB:[.2,.4,.6,.8,1,.8,.6,.4],rowC:[1,.8,.5,.2,1.2,.5,.4,0],direction:'pendulum'}}),
 scene('14 / Mixed oscillators, separate envelope','Play the keyboard. The DC mixer combines Moog saw, ARP pulse and Buchla complex wave. The extra rise/fall function controls a VCA before the filter.',{'moog.level':.6,'moog.initial':1,'tools.mix1':.45,'tools.mix2':.3,'tools.mix3':.2,'tools.fall':.8,'buchla.fm':.2,'buchla.fold':1.1},{'tools.mix1':'moog.oscA','tools.mix2':'arp.v2pulse','tools.mix3':'buchla.complex','tools.vcaAIn':'tools.mixOut','tools.functionGate':'bridge.gate','moog.audio':'tools.vcaA'}),
 scene('15 / Filter-bank keys','Play the keyboard. The Moog voice passes through the fixed filter bank. Raise individual bands to change its body.',{'moog.level':0,'fx.level':.65,'moog.cutoff':7000,'fx.band2':1.6,'fx.band5':1.8,'fx.band8':1.2}),
 scene('16 / Clocked high-pass percussion','Start audio. Clock pulses trigger the ARP noise envelope; the new high-pass output removes the low end. Cutoff changes the percussion color.',{'moog.level':0,'fx.level':.65,'fx.monitor':3,'fx.cutoff':2200,'arp.v1level':0,'arp.v2level':0,'arp.noiseLevel':.8,'arp.noiseColor':0,'arp.cutoff':15000,'arp.filterKey':0,'arp.attack':.001,'arp.decay':.06,'arp.sustain':0,'arp.release':.035,'arp.reverb':0,'tempo':98},{'arp.adsrGate':'bridge.clock','fx.audio':'arp.out'},{sequencer:true}),
 scene('17 / Microphone vocoder','Enable mic and speak. The microphone shapes twelve bands of the Moog saw carrier. Play keys to change carrier pitch; Formant shift changes the vocal color.',{'moog.level':0,'fx.level':.8,'fx.monitor':4,'moog.tune':0,'fx.sensitivity':12,'bridge.micGain':3}),
 scene('18 / Cross-cabinet spectral rhythm','Start audio. Buchla cycles shape the spectrum of an ARP pulse carrier. No microphone is needed. Formant CV comes from sequencer row B.',{'moog.level':0,'fx.level':.65,'fx.monitor':4,'fx.sensitivity':10,'buchla.cycle':1,'buchla.fm':1.3,'arp.v2coarse':-12},{'fx.modulator':'buchla.out','fx.carrier':'arp.v2pulse','fx.formantCV':'tools.rowB'},{sequencer:true,sequence:{...sequenceDefaults(),rowB:[0,.1,.2,.3,0,-.1,-.2,.1]}}),

];
export {arpDefaults,arpPresets};
