# Sequencing and studio utilities

Early modular sequencers sent control voltages to oscillators, filters or amplifiers, with separate pulses to trigger envelopes. A voltage row need not represent notes. Different rows can move pitch, brightness and loudness at the same time; divided clocks let cabinets play at different rates.

## Historical references

- The original [Moog 1973 catalog](https://www.vintagesynth.com/sites/default/files/2017-05/moog_cat_73.pdf) describes the 960's three simultaneous eight-stage voltage rows, the 961 trigger interface, the 962 sequential switch, mixers, and Bode ring modulators/frequency shifters. These motivate the three-row controller and routing utilities here.
- The original [ARP 1601 service manual](https://synthfool.com/docs/Arp/ArpSequencer/ARP__Sequencer_1601__Service_Manual_text.pdf) documents a sixteen-step voltage sequencer, gate assignments, random operation, and quantizers. TONTO borrows useful functions; it is not a sixteen-step 1601 replica.
- The [Buchla/Tiptop 245t manual](https://tiptopaudio.com/manuals/Buchla_%26_Tiptop_Audio_245t.pdf) documents the authorized modern adaptation of the 245: five stages with four stored voltages per stage, a pulser, advance input and stage selection. It supports independent voltage-row patching, not a claim that our eight-stage panel duplicates Buchla hardware.
- [EMS's product history, 1969–1979](https://emssynthesisers.co.uk/emsprods.html) lists the Synthi AKS with a KS sequencer, the separate Synthi Sequencer 256 with external clocking, and standalone slew, random-voltage and filter-bank accessories. Its later products include a phase frequency shifter and vocoders.

## Added to TONTO

| Component | What it does |
| --- | --- |
| Three-row sequencer | Eight stages, selectable length 1–8; A is ±24 semitones, B/C are independent ±5 V rows. Forward, reverse, pendulum and random directions. |
| Step modes | Play emits a gate; Rest retains the voltage and clock but suppresses the gate; Skip removes the stage from the sequence. All skipped is silent, with no clock pulses. |
| Clock and transport | Quarter/eighth/sixteenth/32nd-note timing, swing, 5–95% gate duty, start/stop, reset and manual advance. Manual advance emits a 50 ms pulse when stopped. |
| External clock/reset | Patching Sequence clock replaces the internal tempo clock. Start arms it; the first rising edge plays the first eligible stage. High is ≥2 V; low is ≤1 V. A held high voltage does not repeatedly trigger. Gate duration follows the external pulse. |
| Clock divider | ÷2, ÷4 and ÷8 pulse outputs, synchronized by Reset. Division counts pulses; output pulses retain the incoming width, rather than becoming 50% square waves. |
| Three-way sequential switch | Selects one of three continuously running audio/CV inputs. Each advance pulse selects the next input. First pulse after reset selects input 1. |
| DC mixer | Three inputs with signed gains from −2 to +2 and a ±5 V offset. Handles audio and control voltage. Output bounded at ±20. |
| Dual linear VCA | Independent A/B signal inputs and CV inputs. Gain = initial + CV/10, clamped to 0–1. Can control audio amplitude or modulation depth. |
| Rise/fall function | Triggered linear attack/decay, 0–10 V, optional cycle, end-of-cycle pulse. Holding the trigger high produces one envelope. End pulse lasts one audio sample. |
| Pitch quantizer | Chromatic, major, minor and major pentatonic scales with selectable root. Works with negative pitch voltages. |
| Slew limiter | Independent rise/fall slopes, in seconds per volt. Smooths pitch changes or other CV. |

The sequencer and utilities use the 1 V/octave, 5 V positive-gate convention. Modern mode adapts typed pitch and gate jacks across cabinet conventions. The mix and switch outputs carry untyped CV: feed a quantizer or explicit scaler when pitch conversion is needed. Ground bonds apply to the new cabinet in historical mode.

The existing keyboard transposes Row A by default. Turn off **Keyboard transposes A** for a fixed sequence anchored at C3. This does not alter B or C. Sequence settings, rows, step modes and all utility controls/routes are saved with patches. Old version-1 patches receive compatible defaults.

## Normal connections

- Clock pulse → Divider clock; Clock ÷2 → Switch advance.
- Switch inputs 1/2/3 receive Row A/B/C respectively.
- Sequence gate → Function trigger; Function → both VCA CV inputs.
- Row A → Quantizer in → Slew in.
- Mixer and VCA signal inputs are empty until patched. Utility outputs must feed a cabinet to be heard; there is no extra utility audio fader.
- Any explicit cable replaces the normal; unplugging restores it. Reset resets the sequence, clock counters and switch. Stop resets the sequence position and suppresses its gates; downstream envelope releases can still sound.

## Starting patches

11 / **Three-row sequence**: A sets Moog pitch, B changes filter cutoff, C sets an extra VCA's amplitude; the function gates the final amplifier.

12 / **Divided cabinet duet**: Moog and Buchla share pitch but play at different rates. Rests affect the Moog gate; the Buchla follows the separate divided clock.

13 / **Switched voltage melody**: the switch alternates among A/B/C voltages; the quantizer and slew produce a minor-key melody with portamento.

14 / **Mixed oscillators, separate envelope**: Moog, ARP and Buchla oscillators enter the signed mixer, then a function-controlled VCA and the Moog filter. Play a keyboard note to trigger it.

## Scope and remaining gaps

These are functional browser modules inspired by period workflows. They do not reproduce the exact panel, voltage range, timing drift or circuitry of a 960, 1601, 245 or KS. Musical scale selection, swing and the compact combined layout are conveniences. The sequencer has eight stages; 16/24-step chaining, keyboard recording and MIDI clock transport are not implemented.

Noise, sample-and-hold, lag, ring modulation, envelope following, spring-style reverb, tape varispeed/overdubbing and signal viewing already existed. Output fan-out already provides a multiple. This addition supplies independent cross-cabinet routing stages without removing those original modules.

The Spectral studio cabinet now adds a fixed filter bank, low/band/high-pass stages and a 12-band vocoder; see the [audit and module notes](audit.md). A Bode-style frequency shifter, analog phaser, quadraphonic routing and deeper hardware calibration remain outside this release.
