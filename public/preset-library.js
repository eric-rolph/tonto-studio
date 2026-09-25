import {presets,freshPatch,validatePatch,controls,ports} from './model.js';
import {arpLibrary} from './arp/model.js';
import {tontoExpansion} from './preset-bank.js';
import {referenceRecipes} from './reference-recipes.js';
export function arpToTonto(raw){const p=freshPatch();p.params['moog.level']=0;p.params['arp.level']=.7;for(const [k,v]of Object.entries(raw.params||{}))if(Object.hasOwn(controls,'arp.'+k))p.params['arp.'+k]=v;for(const [d,s]of Object.entries(raw.routes||{}))if(ports['arp.'+d]?.direction==='input'&&ports['arp.'+s]?.direction==='output')p.routes['arp.'+d]='arp.'+s;return validatePatch(p);}
function build(entry){
 const base=freshPatch();for(const [key,value]of Object.entries(entry.params)){const c=controls[key];if(!c||!Number.isFinite(value)||value<c.min||value>c.max)throw new Error('Invalid library control: '+entry.id+' / '+key);}
 for(const [d,s]of Object.entries(entry.routes))if(ports[d]?.direction!=='input'||ports[s]?.direction!=='output')throw new Error('Invalid library cable: '+entry.id+' / '+d);
 const extra=entry.extra||{};return {...entry,patch:validatePatch({...base,...extra,params:{...base.params,...entry.params},routes:entry.routes,sequence:{...base.sequence,...extra.sequence},performance:{...base.performance,...extra.performance}})};
}
const legacy=[['Cross-cabinet','Cross-cabinet','Keys'],['Texture','Buchla 200','Drone'],['Sequence','EMS VCS3','Sequence'],['Voice','ARP 2600','Microphone'],['Texture','Eurorack','Keys'],['Cross-cabinet','Cross-cabinet','Keys'],['Voice','Eurorack','Microphone'],['Pad','ARP 2600','Keys'],['Study','Cross-cabinet','Study'],['Study','Cross-cabinet','Study'],['Sequence','Moog 55','Sequence'],['Sequence','Cross-cabinet','Sequence'],['Sequence','Moog 55','Sequence'],['Cross-cabinet','Cross-cabinet','Keys'],['Keys','Spectral studio','Keys'],['Percussion','Spectral studio','Sequence'],['Voice','Spectral studio','Microphone'],['Sequence','Cross-cabinet','Sequence']];
export const studioLibrary=[
 ...presets.map((p,i)=>({id:'studio-'+(i+1),silent:i===9,name:p.name,category:legacy[i][0],family:legacy[i][1],mode:legacy[i][2],description:p.note,play:p.note,tags:[legacy[i][0]],note:60,patch:p.patch})),
 ...tontoExpansion.map(build),
 ...arpLibrary.map(p=>({...p,id:'bank-'+p.id,name:'2600 / '+p.name,patch:arpToTonto(p.patch)})),
 ...referenceRecipes.map(p=>({...p,id:'reference-'+p.id,category:'Reference study',family:({moog:'Moog 55',buchla:'Buchla 200',arp:'ARP 2600',ems:'EMS VCS3',euro:'Eurorack',mixed:'Cross-cabinet'})[p.family],mode:p.patch.sequencer?'Sequence':'Keys',play:`Reference study: MIDI note ${p.note}, gate ${p.gate} s. ${p.description}`,tags:['reference','comparison']})),
];
