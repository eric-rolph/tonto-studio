# Specification reconciliation

The supplied document is retained in `original-specification.md` as design input. Its embedded Claude Code prompt is not an instruction to discard the existing 2600 implementation or change deployment platforms.

## Existing system reused

The ARP model is copied from 2600 Studio at commit `40349e6`. Its source identifiers, parameter names and internal normals are preserved in `public/arp/`. The wrapper maps every original input onto the shared bus. Explicit connections interrupt normals; removing a cable restores them. Tape and the click/drag cable interaction are reused. Deployment retains the local Windows encrypted credential store and uses a new repository-specific runner.

## Corrections and boundaries

1. **Pitch:** a raw 1.2 V change into a 1 V/octave oscillator makes 1.2 octaves (14.4 semitones), not 10 semitones. A 1 V change into a 1.2 V/octave input makes 10 semitones. Only modern mode or an explicit scaler converts using `destinationVoltsPerOct / sourceVoltsPerOct`. The source document's sample function applied correction while describing an uncorrected cable; those cases are separated here.
2. **Gate:** S-Trig is modeled as active-low switch state, not negative voltage. Unadapted V-Trig/S-Trig cables remain inactive. Internal normal connections include adapters in both modes so the initial instruments remain playable. The bridge has dedicated outputs for both polarities.
3. **Ground:** ground switches represent chassis bonds to a common master, with a synthetic mains waveform on unbonded cross-cabinet banana connections. This is not a prediction that every physical ungrounded connection makes a specific hum amplitude. Only an active cable with a floating return incurs that model.
4. **Voltage units:** audio is normalized ±1 (nominal ±5 V peak); CV is in volts. Audio to control inputs is intentionally allowed, including microphone to pitch/FM/gates. Envelope following is the appropriate way to drive a gate from vocal loudness. Nominal source impedance is 1 kΩ and input impedance 100 kΩ. These are model constants, not measurements of every historical jack.
5. **Timing:** the AudioWorklet runs at the actual device sample rate, not a hard-coded 96 kHz. Moog and ARP oscillator/filter stages oversample 2× internally. Explicit patch edges read the previous sample so feedback has a defined one-sample delay. Matrix and internal normals follow documented cabinet evaluation order. Control values are smoothed on the audio thread.
6. **Authenticity:** no validated circuit component solver is included. The named families are architecture-inspired DSP models. EMS pitch sensitivity is a practical 1 V/octave baseline in this version, not a calibrated model of a particular VCS3. Buchla voltage conventions varied by instrument and period; 1.2 V/octave is the selected model convention.
7. **Open-source ports:** the specification lists several libraries without pinned versions, measured acceptance criteria or license review. No third-party DSP is silently substituted or claimed. In particular, the Eurorack code is original JS and is not Mutable Instruments firmware. The Moog filter is the project's own saturating ladder approximation, not ChowDSP. These facts also appear in the in-app guide.
8. **Cable rendering:** cable sag is a cubic curve, not a mechanical catenary solver. Historical adapter controls appear in the inspector. Ground bonds use cabinet switches. These UI representations expose the requested routing consequences without pretending to simulate plug mechanics.

## Source references

- Buchla's 218 guide documents the 1.2 V/octave convention: https://buchlausa.github.io/buchla_doc/docs/easel-family/218e-v3
- Mutable Instruments documents the Plaits source, MIT license and firmware toolchain: https://pichenettes.github.io/mutable-instruments-documentation/modules/plaits/open_source/
- Original specification: `original-specification.md`.

## Further fidelity work

Porting Plaits/Clouds/Rings requires pinned source revisions, copyright/license notices, a reproducible WASM toolchain and reference-output regression tests. Circuit-level Moog/Buchla/EMS claims require selected hardware revisions, measured responses, tuning/aliasing/feedback tests and comparison against those measurements. Those are future fidelity work, not implemented capabilities of this release.

Existing browser features are independent of that work: all five cabinets generate/process audio; all 68 inputs are patchable; MIDI/microphone/tape, both routing modes, historical converter controls, the matrix, sequencer and persistent patches are functional.
