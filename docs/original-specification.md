# TONTO Engine: Cross-Platform Heterogeneous Modular Synthesizer System
## Technical Specification & Implementation Guide for Claude Code

---

## 1. Executive Summary & Vision

The **TONTO Engine** is a circuit-level, hyper-realistic virtual simulation environment that models iconic, historically incompatible vintage modular synthesizers and allows them to be patched together within a single unified workspace.

### Core Philosophy
In the physical world, connecting a Moog Modular, Buchla 200, ARP 2600, EMS VCS3, and modern Eurorack system is not merely a matter of dragging a virtual cable. It requires overcoming impedance mismatches, conflicting trigger architectures, incompatible pitch standards, and floating chassis grounds.

This specification directs Claude Code to build:
1. **Accurate component-level virtual emulations** of five foundational modular architectures, leveraging validated open-source DSP codebases.
2. **A universal analog voltage and physics bus** that simulates real-world electrical behaviors (attenuation, loading, trigger inversion, floating grounds, 60Hz hum).
3. **The TONTO Bridge System**: Historical converter utilities (inspired by Malcolm Cecil's master console) alongside a "Permissive/Modern Mode" for seamless experimentation.
4. **Integration hook for existing assets**: Slotted architecture for an existing digital ARP 2600 engine, real-time microphone input processing, and MIDI-to-CV conversion.

---

## 2. Target Instrument Architectural Profiles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TONTO MASTER CONSOLE BUS                           │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│ Moog 55/IIIc│ Buchla 200  │  ARP 2600   │  EMS VCS3   │   Eurorack (Modern) │
│ (East Coast)│ (West Coast)│ (Semi-Mod)  │ (Pin-Matrix)│ (Hybrid/Digital)    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────────────┤
│ • 1V/Oct CV │ • 1.2V/Oct  │ • 1V/Oct CV │ • Linear /  │ • 1V/Oct CV         │
│ • S-Trig    │ • V-Trig    │ • V-Trig    │   Var-Scale │ • V-Trig (+5V/+10V) │
│ • 1/4" Jacks│ • Bananas   │ • 3.5mm Min │ • 16x16 Pin │ • 3.5mm Mini Jacks  │
│ • Transistor│ • LPG + Fold│ • 4012/4072 │ • Diode Res │ • Mutable / Digital │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────┘
```

### 2.1 ARP 2600 (Base Unit + Audio/Mic In)
* **Status**: Core DSP framework largely in place. Needs encapsulation into the universal connector bus.
* **Architecture**: 3x VCOs (VCO-1 dual-wave, VCO-2/3 multi-wave with sync), ARP 4012/4072 4-pole cascaded low-pass filter, 4010 VCA, 4015 S&H/Noise, 4019 Ring Modulator, AR + ADSR envelope generators, Spring Reverb tank.
* **External Audio / Mic In**: Preamplifier stage with high-gain saturation and envelope follower. Used for dynamic vocoder-like modulations, live vocal squawks (e.g., R2-D2 sound design), and acoustic instrument gating.
* **Fader Normalization**: Slider inputs are pre-wired (normalled). Inserting a 3.5mm cable breaks the internal normal connection.

### 2.2 Moog Modular System 55 / IIIc
* **Oscillators**: 921A oscillator drivers controlling 921B VCOs. Rich harmonic sawtooth, triangle, pulse with width modulation.
* **Filter**: 904A 24dB/octave (4-pole) transistor ladder filter with characteristic non-linear saturation and low-end drop at high resonance.
* **Envelopes**: 911 Envelope Generators utilizing T1 (Attack), T2 (Decay), T3 (Release) timing stages and E_sus voltage.
* **Control Standard**: 1.000 V/Octave pitch scaling; **S-Trig** (Switch Trigger).
* **Connectors**: Heavy-duty 1/4" TS phone plugs.

### 2.3 Buchla 200 Series
* **Core Philosophy**: Additive/FM synthesis rather than subtractive filtering.
* **Complex Oscillator (Model 259)**: Dual oscillator setup. Principal VCO modulated via dedicated Modulation VCO (Lin/Exp FM, AM), feeding into a multi-stage diode **Wavefolder / Wavemultiplier**.
* **Dual Low-Pass Gate (Model 292)**: Frequency and amplitude controlled simultaneously using simulated **Vactrols** (resistive photocells with slow, organic release tails).
* **Dual Function Generator (Model 281)**: Quadrature attack/decay functions, looping LFO behavior, slew generation.
* **Control Standard**: **1.200 V/Octave** (0.1V per semitone). Pulses (+10V) with separate trigger/CV channels.
* **Connectors**: Ungrounded stackable **Banana jacks** for CV/Gate; Tini-Jax / Switchcraft minijacks for audio signals.

### 2.4 EMS VCS3 ("The Putney") / Synthi A
* **Routing**: Complete elimination of cables on the front panel in favor of a **16×16 Resistive Pin Matrix**.
* **Filter**: 18dB/octave diode ladder filter with unique squelchy resonance behavior and asymmetrical clipping.
* **Oscillators**: 3x non-standard oscillators capable of extreme low frequencies up to supersonic ranges; free-running without standard temperaments.
* **Envelope**: "Trapezoid" envelope generator (Attack, On, Decay, Off) that loops into an LFO.
* **Joystick**: Dual-axis XY potentiometer with attenuators for manual voltage steering.

### 2.5 Eurorack (Modern Macro Modules)
* **Ecosystem**: High-density 3.5mm audio and CV environment.
* **Digital Macro Voices**: Port of open-source Mutable Instruments modules (Plaits macro-oscillator, Clouds granular texture processor, Rings resonator).
* **Control Standard**: 1.000 V/Octave; standard active-high V-Trig (+5V or +10V).

---

## 3. The Electrical Physics & Simulation Engine

To deliver true historical realism, the engine must model the electrical incompatibilities that engineers faced when cross-patching these instruments.

```
       [SOURCE PLUG]                                  [DESTINATION JACK]
    ┌──────────────────┐                            ┌───────────────────┐
    │ Type: Banana     │                            │ Type: 1/4" Moog   │
    │ Standard: Buchla │────── Physical Cable ─────▶│ Standard: Moog    │
    │ Ground: FLOATING │   Mismatch Detected:       │ Ground: CHASSIS   │
    └──────────────────┘   • No Common Ground       └───────────────────┘
                           • 1.2V/Oct to 1V/Oct
                           • Banana -> 1/4" Adapt.
                                    │
                                    ▼
                         ELECTRICAL CONSEQUENCES:
                         1. +60Hz Mains Hum injected
                         2. Microtonal pitch compression
                         3. Floating DC offset instability
```

### 3.1 Voltage Scaling Incompatibilities
The engine must compute pitch CV conversions through active transfer functions:

$$\text{Moog / ARP / Eurorack (1.0V/Oct)}: f = f_0 \cdot 2^{V_{in}}$$

$$\text{Buchla (1.2V/Oct)}: f = f_0 \cdot 2^{(V_{in} / 1.2)}$$

$$\text{EMS VCS3 (Idiosyncratic / Non-linear)}: f = f_0 \cdot 2^{(V_{in} \cdot k_{drift})}$$

* **Direct Cable Connection Rule**: If a user patches a Buchla 1.2V/Oct sequencer directly into a Moog 1V/Oct oscillator without a scaling attenuator, the intervals become compressed: an octave played on the Buchla sequencer registers as only 10 semitones ($1.0 / 1.2 \approx 0.833$ octaves) on the Moog.

### 3.2 Gate / Trigger Architectures: V-Trig vs. S-Trig
* **V-Trig (Voltage Trigger)**: Normal state is 0V; active state is a positive pulse ($+5\text{V}$ to $+15\text{V}$).
* **S-Trig (Switch Trigger)**: Normal state is floating or pulled up ($+5\text{V}$); active state is shorted to ground ($0\text{V}$, low resistance $\le 100\,\Omega$).
* **Cross-Connection Behavior**:
  * Direct V-Trig $\to$ S-Trig input: Fails to trigger the envelope, or leaves the envelope gate continuously locked open.
  * Direct S-Trig $\to$ V-Trig input: Does not generate sufficient positive voltage to cross the Schmitt trigger threshold ($V_{th} \approx +2.5\text{V}$).
  * **Solution Module**: Transistor inverter circuit (`S-Trig <-> V-Trig Converter`).

### 3.3 Chassis Grounding & Hum Induction
* **Buchla Single-Conductor Bananas**: Banana jacks transmit only the signal pin, relying on external cabinet bonding for the signal return.
* **Hum Simulation Formula**: When a Buchla CV source is connected to a Moog, ARP, or Eurorack input without a ground bridge, inject 60Hz (or 50Hz) mains hum and DC drift into the signal:

$$V_{out}(t) = V_{in}(t) + A_{hum} \cdot \left[ \sin(2\pi \cdot 60 t) + 0.35\sin(2\pi \cdot 120 t) + 0.15\sin(2\pi \cdot 180 t) \right] + V_{drift}(t)$$

* **The "Alligator Ground Strap"**: The user must click a chassis bonding strap between the Buchla frame and the target synthesizer frame to extinguish the hum loop.

### 3.4 Physical Connector Adapters
A cable connection can only be established if:
1. The plug type matches the jack type; OR
2. An inline adapter or conversion cable is selected:
   * 1/4" Male to 3.5mm Female adapter
   * 3.5mm to Single Banana adapter with ground spade
   * Pin-Matrix bridge cable (EMS multi-pin to 3.5mm breakout)

---

## 4. Open-Source DSP Engine Integration Map

Claude Code should draw from and port existing open-source C++, Faust, and Rust implementations:

| Synth Target | Module / Circuit | Open-Source Source / Library | Implementation Method |
| :--- | :--- | :--- | :--- |
| **Moog** | 904A Transistor Ladder Filter | **ChowDSP (`Chow-TransistorLadder`)** / **Vult DSP** | Non-linear Runge-Kutta 4th order ODE solver modeling transistor thermal voltage $V_t$ |
| **Moog** | 921B Oscillators | **Soundpipe (sp_blosc)** or **Bogaudio VCO** | Band-limited PolyBLEP / MinBLEP oscillator anti-aliasing |
| **Buchla** | 292 Low-Pass Gate | **ChowDSP Vactrol Model** / **Bogaudio LPG** | Two-pole Sallen-Key low-pass filter with non-linear LDR photocell lag resistance |
| **Buchla** | 259 Wavefolder | **Valley Rack (Terrorform)** / **Audible Instruments (Warps)** | Multi-stage anti-parallel diode pair transfer curve |
| **ARP** | 4012 / 4072 Filters | **Bristol Synth Engine (`bristol/arppulse`)** / **Vult 46&2** | Saturated 4-pole cascade with discrete feedback loop |
| **ARP** | Spring Reverb Tank | **Dattorro Tank / Jatin Chowdhury Spring Sim** | Dispersive delay lines + physical wave reflection filtering |
| **EMS** | VCS3 Diode Ladder Filter | **Daffy Diode Filter (Faust DSP)** / **Bristol Synthi** | Asymmetric diode-string bias and non-linear damping |
| **EMS** | 16x16 Resistive Pin Matrix | Custom C++ Matrix Router with summing resistors | Simulates resistor tolerance variance ($100\text{k}\Omega \pm 5\%$) causing slight crosstalk |
| **Eurorack** | Plaits / Clouds / Rings | **Mutable Instruments DSP (by Émilie Gillet - MIT)** | Direct port of hardware C++ DSP files (`stmlib` and module cores) |

---

## 5. Software Architecture & Class Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                    AudioContext / Engine                     │
├───────────────────────────────┬──────────────────────────────┤
│       Signal Matrix Bus       │       Physics Engine         │
│  - Multi-rate: Audio (96kHz)  │  - Grounding Bus State       │
│  - Control Rate CV (24kHz)    │  - Impedance Loading         │
│  - PolyBLEP Anti-Aliasing     │  - Cable Drift / Hum Loop    │
└───────────────▲───────────────┴──────────────▲───────────────┘
                │                              │
       ┌────────┴──────────────────────────────┴───────┐
       │             Virtual Synthesizer Chassis       │
       ├───────────────────────────────────────────────┤
       │  • ARP 2600 Chassis (Pre-wired Normalled)     │
       │  • Moog 55 Chassis (1/4", S-Trig, 1V/Oct)     │
       │  • Buchla 200 Chassis (Banana, 1.2V/Oct)      │
       │  • EMS VCS3 Chassis (Resistive Pin Matrix)    │
       │  • Eurorack Modern Chassis (3.5mm, 1V/Oct)    │
       │  • TONTO Bridge Console (Active Converters)   │
       └───────────────────────────────────────────────┘
```

### 5.1 Connector & Port Data Structures (TypeScript / C++)

```typescript
// Definition of port physical and electrical standards
export enum ConnectorType {
  PHONE_QUARTER_INCH = '1/4_TS',
  MINI_JACK_3_5MM = '3.5MM_TS',
  BANANA_PLUG = 'BANANA_SINGLE',
  EMS_MATRIX_PIN = 'EMS_PIN'
}

export enum SignalStandard {
  VOLT_PER_OCTAVE = '1V_PER_OCTAVE',
  BUCHLA_1_2V = '1.2V_PER_OCTAVE',
  V_TRIG_5V = 'V_TRIG_5V',
  V_TRIG_10V = 'V_TRIG_10V',
  S_TRIG = 'S_TRIG_GROUND_SWITCH',
  BIPOLAR_AUDIO = 'AUDIO_10V_PP',
  EMS_PIN_ROUTING = 'EMS_PIN_MATRIX'
}

export interface ChassisGroundState {
  chassisId: string;
  isGroundedToMasterBus: boolean;
  resistanceToGroundOhms: number;
}

export interface PatchCable {
  id: string;
  sourceConnector: ConnectorType;
  destConnector: ConnectorType;
  sourceStandard: SignalStandard;
  destStandard: SignalStandard;
  isGroundStrapAttached: boolean;
  lengthMeters: number;
  resistanceOhms: number;
}
```

### 5.2 The Cable Physics Processing Step

```cpp
// Audio engine per-sample evaluation of cross-patch signal
float EvaluateCrossPatchConnection(const PatchCable& cable, float rawSignal, ChassisGroundState srcGround, ChassisGroundState destGround) {
    float processedSignal = rawSignal;

    // 1. Check for Trigger Type Incompatibility
    if (cable.sourceStandard == V_TRIG_5V && cable.destStandard == S_TRIG) {
        // V-Trig into S-Trig fails without Cecil transistor inverter
        return 5.0f; // Remains pulled up to +5V; does not ground out. Envelope fails to fire.
    }

    // 2. Check for Pitch Scaling Mismatch
    if (cable.sourceStandard == BUCHLA_1_2V && cable.destStandard == VOLT_PER_OCTAVE) {
        // Compress 1.2V/Oct into 1.0V/Oct
        processedSignal = rawSignal * (1.0f / 1.2f);
    } else if (cable.sourceStandard == VOLT_PER_OCTAVE && cable.destStandard == BUCHLA_1_2V) {
        // Expand 1.0V/Oct into 1.2V/Oct
        processedSignal = rawSignal * 1.2f;
    }

    // 3. Ground Loop & Floating Ground Hum Simulation
    if (cable.sourceConnector == BANANA_PLUG && !cable.isGroundStrapAttached) {
        if (!destGround.isGroundedToMasterBus) {
            float hum = 0.45f * sinf(2.0f * M_PI * 60.0f * globalTime)
                      + 0.15f * sinf(2.0f * M_PI * 120.0f * globalTime);
            processedSignal += hum;
        }
    }

    return processedSignal;
}
```

---

## 6. The Two User Operational Modes

To cater to both pure historians and creative musicians, the engine provides an instantaneous global toggle:

### Mode 1: "1971 TONTO Physics" (Purist Mode)
* Full electrical consequence simulation enabled.
* Connecting a Buchla to a Moog requires dragging an **Alligator Ground Strap** between frames.
* Connecting an ARP 2600 gate out to a Moog 911 envelope input requires inserting a **Cecil S-Trig Converter Box**.
* Pitch mismatches stay out of tune unless routed through the **TONTO Active Attenuverter / Precision Scaler**.
* Physical adapters must be dragged onto cables when jack sizes mismatch.

### Mode 2: "Modern Multiverse" (Permissive Mode)
* Dynamic auto-conversion on all connections.
* Gate signals automatically adapt between V-Trig and S-Trig.
* Pitch CVs auto-quantize/rescale to $1.0\text{V/Oct}$.
* Universal cable visualizer allows plugging any source into any destination with zero electrical degradation or ground hum.

---

## 7. Curated Historical Patches & Interactive Tutorials

The system must bundle interactive historical presets that reconstruct famous recordings:

### Preset A: Stevie Wonder & Malcolm Cecil – "The Living Synth Bass"
* **Target Sound**: The responsive, squelchy, vocal-like bassline from *Innervisions* and *Talking Book*.
* **Routing Architecture**:
  1. Keyboard CV routed simultaneously to Moog 921 VCOs and ARP 2600 VCO-2.
  2. Moog Sawtooth waveform blended with ARP Pulse wave (narrow duty cycle).
  3. Combined signal fed into the **Moog 904A 24dB Ladder Filter**.
  4. Modulation: Moog 911 Envelope Generator opens the filter with a snappy 25ms attack and 350ms decay.
  5. **Dynamic Control**: Expression pedal input modulates the filter cutoff frequency in real time during the note duration.
  6. Sub-oscillator routed to ARP 2600 VCA for low-end body.

### Preset B: Morton Subotnick – "Silver Apples West Coast Patch"
* **Target Sound**: Self-generating, organic percussive bleeps and FM chirps.
* **Routing Architecture**:
  1. Buchla 259 Modulation VCO set to high frequency, modulating the Principal VCO via Exponential FM.
  2. Buchla 281 Function Generator set to cycling (self-looping attack/decay curves).
  3. Output routed to the **Model 292 Low-Pass Gate** set to "BOTH" (simultaneous filter and VCA damping).
  4. Vactrol decay parameter set to slow ring (~450ms) to create acoustic-like hand drum resonance.

### Preset C: Pink Floyd – "On the Run" (VCS3 Sequence & Filter Sweep)
* **Target Sound**: The hypnotic 8-note sequence driving *The Dark Side of the Moon*.
* **Routing Architecture**:
  1. External step sequencer routed through the **EMS 16x16 Pin Matrix**.
  2. Pin matrix directs output to Oscillator 1 (square wave) and Oscillator 2 (sine wave detuned slightly).
  3. Output routed through the EMS Diode Ladder Filter.
  4. Noise generator pinned to filter frequency input for intermittent white noise grit.
  5. Output sent directly into the onboard VCS3 Spring Reverb unit.

### Preset D: Ben Burtt – "R2-D2 Vocalizations" (ARP 2600 + Mic Input)
* **Target Sound**: The iconic expressive chirps, whistles, and emotional squeaks of R2-D2.
* **Routing Architecture**:
  1. Live microphone / human voice patched into the ARP 2600 Preamp Input.
  2. Preamp signal routed to Input X of the **4019 Ring Modulator**.
  3. ARP 2600 VCO-1 tuned to high sine wave, patched into Input Y of the Ring Modulator.
  4. ARP Envelope Follower tracks vocal volume to modulate VCO-2 frequency and filter cutoff.
  5. The performer's natural vocal inflections (coos, whistles, yelps) are converted into electronic speech.

---

## 8. UI / UX Design & Skeuomorphic Interaction

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Mode: 1971 TONTO Physics ▼] [Master Ground: CONNECTED] [Sample Rate: 96kHz] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────┐     ┌──────────────┐     ┌───────────────────────────┐   │
│    │ MOOG SYSTEM  │     │ BUCHLA 200   │     │ ARP 2600 (Semi-Modular)   │   │
│    │   [1/4" TS]  │     │  [BANANAS]   │     │ [3.5mm Mini / Normals]    │   │
│    │              │     │              │     │  ┌───────┐ ┌────────────┐ │   │
│    │  (O) 921 VCO │     │  (o) 259 VCO │     │  │MIC IN │ │4012 FILTER │ │   │
│    │   │          │     │   │          │     │  └───────┘ └────────────┘ │   │
│    └───┼──────────┘     └───┼──────────┘     └───────────────────────────┘   │
│        │ (1/4" Cable)       │ (Stackable Banana)                             │
│        ▼                    ▼                                                │
│    ┌─────────────────────────────────────────────────────────────────────┐   │
│    │               TONTO CENTRAL CONVERTER & ROUTING BRIDGE              │   │
│    │  [S-Trig/V-Trig Inverter] [1.2V -> 1V Scaler] [Chassis Ground Strap]│   │
│    └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

1. **Distinct Visual Languages per Instrument**:
   * **Moog Modular**: Brushed black anodized aluminum panels, silver Moog-style pointer knobs, large nickel 1/4" phone jacks.
   * **Buchla 200**: Royal blue and silver panels, distinctively colored round knobs, colored stackable banana jacks (red/black for pulses, blue/violet for CV).
   * **ARP 2600**: Classic black-and-orange (or gray Rev 2) silkscreen, vertical linear faders with colored rubber grips, 3.5mm jacks.
   * **EMS VCS3**: Marine plywood slant-front housing, 16×16 coordinate grid with green/red/white pins, silver aluminum joystick with black ball tip.
   * **Eurorack**: 3U silver anodized aluminum or matte black panels with modern knurled nuts and LED indicators.
2. **Dynamic Cable Physics**:
   * Patch cables must render as catenary curves with physical sag, oscillation when dropped, and natural tension behavior.
   * Color-coding corresponds to functional conventions (e.g., Moog black cables; Buchla red gate / blue pitch; ARP gray / orange).
   * Visual adapter widgets appear snapped onto cable ends when plugging across jack types.

---

## 9. Phased Implementation Roadmap for Claude Code

### Phase 1: Core Engine & ARP 2600 Encapsulation
* [ ] Verify audio context, multithreaded audio worklet architecture, and real-time audio pipeline.
* [ ] Integrate existing ARP 2600 DSP code into the universal chassis wrapper.
* [ ] Implement active Microphone / Line Input module with variable-gain preamplification and envelope follower.
* [ ] Verify Web MIDI / MIDI input binding to virtual CV/Gate generation.

### Phase 2: Instrument Expansion & Open-Source Porting
* [ ] Port **ChowDSP Transistor Ladder** for the Moog 904A filter; build 921 oscillator bank with PolyBLEP anti-aliasing.
* [ ] Implement Buchla 259 Complex Oscillator (Carrier + Modulator + Wavefolder) and Model 292 Low-Pass Gate with vactrol decay simulation.
* [ ] Build EMS VCS3 16x16 pin-matrix crossbar routing component, diode ladder filter, and joystick vector generator.
* [ ] Integrate open-source Mutable Instruments DSP code (Plaits/Clouds) into Eurorack chassis containers.

### Phase 3: The Universal Voltage & Physics Bus
* [ ] Build the connector abstraction layer (`1/4"`, `3.5mm`, `Banana`, `EMS Matrix Pin`).
* [ ] Implement electrical consequence calculator:
  * V-Trig vs. S-Trig failure and inversion logic.
  * 1.0V/Oct vs. 1.2V/Oct scaling transforms.
  * Floating ground hum induction loop ($60\text{Hz}$ injection).
* [ ] Implement Malcolm Cecil TONTO Bridge utilities (Alligator ground straps, active trigger inverters, attenuverters, master joystick bias).

### Phase 4: UI / Front-Panel Rendering & Presets
* [ ] Construct skeuomorphic, interactive vector-rendered front panels for all five synthesizer families.
* [ ] Implement physics-based catenary rendering for patch cables and stackable banana cords.
* [ ] Build interactive historical preset configurations (Stevie Wonder Bass, Morton Subotnick West Coast generative, Pink Floyd VCS3 sequence, Ben Burtt R2-D2).
* [ ] Implement toggle for **"1971 TONTO Physics"** vs. **"Permissive / Modern Mode"**.

---

## 10. Getting Started Prompt for Claude Code

When initiating development with Claude Code, issue the following execution prompt:

> `"Please review TONTO_SYNTH_ENGINE_SPEC.md. Begin with Phase 1: Set up the core audio engine and connector type system in TypeScript/C++, encapsulate our existing ARP 2600 engine into the Universal Chassis Wrapper, and hook up the real-time microphone preamp and MIDI-to-CV bridge. Implement the Port and Connector interfaces with support for impedance, signal standards (1V/Oct, 1.2V/Oct, V-Trig, S-Trig), and chassis ground states."`