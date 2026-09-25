export function setupSequencer({engine,root,power,safe,status}){
 root.innerHTML=`<div class="sequence-transport"><button id="sequence">Start sequence</button><button id="sequence-reset">Reset</button><button id="sequence-step">Step</button><output id="sequence-position" aria-label="Sequence position">STEP 1</output><label>Tempo <input id="tempo" type="number" min="35" max="220" value="108"> BPM</label><label>Swing <input id="swing" type="range" min="0" max=".45" step=".01" value="0"></label></div>
 <div class="sequence-settings"><label>Length <select data-sequence="length">${Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1} steps</option>`).join('')}</select></label><label>Direction <select data-sequence="direction"><option value="forward">Forward</option><option value="reverse">Reverse</option><option value="pendulum">Pendulum</option><option value="random">Random</option></select></label><label>Step rate <select data-sequence="division"><option value="1">Quarter notes</option><option value="2">Eighth notes</option><option value="4">Sixteenth notes</option><option value="8">32nd notes</option></select></label><label>Gate width <input type="range" data-sequence="width" min=".05" max=".95" step=".01"><output id="gate-width"></output></label><label><input type="checkbox" data-sequence="transpose">Keyboard transposes A</label></div>
 <p class="sequence-note" id="sequence-clock-note">Internal clock. Patch Sequence clock to use an external pulse.</p>
 <div class="sequence-grid" id="steps"><div class="sequence-row-labels"><span>STEP</span><span>A · semitones</span><span>B · volts</span><span>C · volts</span><span>Gate / skip</span></div>${Array.from({length:8},(_,i)=>`<div class="seq-step" data-column="${i}"><strong>${i+1}</strong><input type="number" data-step="${i}" min="-24" max="24" step="1" aria-label="Sequence step ${i+1} semitones"><input type="number" data-row="rowB" data-index="${i}" min="-5" max="5" step=".1" aria-label="Row B step ${i+1} volts"><input type="number" data-row="rowC" data-index="${i}" min="-5" max="5" step=".1" aria-label="Row C step ${i+1} volts"><select data-step-mode="${i}" aria-label="Step ${i+1} mode"><option value="play">Play</option><option value="rest">Rest</option><option value="skip">Skip</option></select></div>`).join('')}</div>
 <p class="sequence-note">Rest keeps the step’s voltages and silences its gate. Skip removes the step. Row A → pitch, Sequence gate → envelope; B and C can move filters, wavefolders or VCAs.</p>`;
 const all=s=>[...root.querySelectorAll(s)],find=s=>root.querySelector(s);
 function sync(){
  const state=engine.state,s=state.sequence;
  find('#sequence').textContent=state.sequencer?'Stop sequence':'Start sequence';find('#sequence').classList.toggle('active',state.sequencer);
  for(const el of all('[data-sequence]')){const v=s[el.dataset.sequence];if(el.type==='checkbox')el.checked=v;else el.value=v;}
  for(const el of all('[data-step]'))el.value=state.steps[+el.dataset.step];
  for(const el of all('[data-row]'))el.value=s[el.dataset.row][+el.dataset.index];
  for(const el of all('[data-step-mode]'))el.value=s.modes[+el.dataset.stepMode];
  for(const el of all('.seq-step'))el.classList.toggle('outside-length',+el.dataset.column>=s.length);
  find('#gate-width').textContent=Math.round(s.width*100)+'%';
  find('#sequence-clock-note').textContent=state.routes['tools.seqClock']?'External clock connected. Start arms the sequence; each rising edge advances a step. Gate length follows the incoming pulse.':'Internal clock. Patch Sequence clock to use an external pulse.';
 }
 root.addEventListener('change',e=>{
  const el=e.target,s=engine.state.sequence;
  if(el.dataset.sequence){const key=el.dataset.sequence;s[key]=el.type==='checkbox'?el.checked:key==='direction'?el.value:+el.value;}
  else if(el.dataset.step!==undefined)engine.state.steps[+el.dataset.step]=Math.round(Math.max(-24,Math.min(24,+el.value||0)));
  else if(el.dataset.row)s[el.dataset.row][+el.dataset.index]=Math.max(-5,Math.min(5,+el.value||0));
  else if(el.dataset.stepMode!==undefined)s.modes[+el.dataset.stepMode]=el.value;
  else return;
  engine.configure();sync();
 });
 find('#sequence').onclick=safe(async()=>{await power();engine.state.sequencer=!engine.state.sequencer;engine.configure();sync();status(engine.state.sequencer?'Sequence running. Row A and Sequence gate are available at the sequencer jacks.':'Sequence stopped.');});
 for(const action of ['reset','step'])find('#sequence-'+action).onclick=safe(async()=>{await power();engine.send('sequence',{action});status(action==='reset'?'Sequence, clock dividers and switch reset.':'Advanced one step.');});
 return {sync,draw(meter){const step=meter.step??0;all('.seq-step').forEach((el,i)=>el.classList.toggle('current',step===i));find('#sequence-position').textContent=(engine.state.sequencer?'STEP ':'STOPPED · ')+(step+1);}};
}
