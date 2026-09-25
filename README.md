# TONTO Studio

A browser instrument with five synthesizer cabinets, a shared patch bus, microphone and MIDI input, an EMS-style pin matrix, and a two-stem tape deck.

Live site: https://tonto-studio.ericrolph.workers.dev/

Private repository: https://github.com/eric-rolph/tonto-studio

## Play

Choose a patch, start audio, and use the on-screen keyboard or A W S E D F T G Y H U J K. Z/X change octaves. MIDI supports notes, velocity, pitch bend, sustain, CC1/11 expression and CC7 master volume. Each cabinet has its own output level and pan.

Click or drag between output and input jacks; valid targets get green rings. A source can feed multiple destinations. Click a connected input to restore its normal connection. The cable inspector provides named routing, signed gain, connector adapters, pitch scaling and trigger conversion.

Enable a microphone, then use **Patch microphone** or **MIC OUT** to reach any input. **MIC ENV** carries loudness as a control voltage. Audio stays in the browser; no server receives microphone samples, recordings or patches. Use headphones while monitoring.

The eight-step sequencer exposes pitch and gate outputs. Patch those to other cabinets, or load Matrix runner. The EMS matrix has 16 sources and 16 destinations; pins sum at full, half or negative strength. External cables override the corresponding column. The joystick supplies two control voltages.

Save stores patches locally. Export/import transfers the complete console state as JSON. Existing 2600 Studio JSON patches import into the ARP cabinet, which also includes the 21 original presets. Factory scenes describe synthesis techniques, not verified recreations of commercial recordings.

Tape records stereo cabinet audio and a separate preamplified mono microphone stem. There are eight takes of up to three minutes, varispeed, saturation, wow/flutter, reverse, offsets, overdub layers, audio import and PCM WAV export. Tape speed and pitch move together. Recordings are in memory: export them before refreshing or closing the page.

## Models and scope

This implements a playable browser version of the supplied specification. It does **not** claim circuit-level or measured hardware accuracy. See [implementation notes](docs/implementation.md) for the exact mapping and remaining research work.

- **ARP:** the existing 2600 Studio `SynthCore`, with its original 32 inputs, 25 sources, normals, oscillator/filter/envelope/control stages and spring approximation. Internal cables and external cabinet cables share those actual DSP inputs.
- **Moog:** oscillator bank, 2× band-limited oscillators and nonlinear four-pole ladder, ADSR and VCA with S-Trig input semantics.
- **Buchla:** FM pair, smooth wavefolder, function generator and lagged low-pass gate; modeled at 1.2 V/octave.
- **EMS:** three oscillators, a three-pole nonlinear diode-style filter, trapezoid, joystick, ring modulation, short feedback reverb and a 16×16 summing matrix.
- **Eurorack:** original FM/harmonic/metal voices, delay resonator and four overlapping windowed grains with freeze. These are **not ports of Plaits, Clouds or Rings**.

Modern mode automatically adapts pitch, gate and connector conventions without quantizing pitch. Historical mode adds nominal loading, raw pitch mismatches, missing-connector open circuits, incompatible gate behavior, matrix resistor variation, and optional synthetic floating-ground hum. Ground switches bond chassis to a common bus. This is an educational voltage model, not a hardware wiring simulator.

## Develop and deploy

Requirements: Node.js, npm, a recent Chrome or Edge, and the existing Windows-user Cloudflare credential store.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run check
npm.cmd run test:browser
./scripts/deploy-local.ps1
```

Local development uses port 8790. Browser tests start that server automatically when needed; CI uses port 8791 for its isolated checkout. `window.studio` exposes a diagnostic handle only on localhost/127.0.0.1. No diagnostics are exposed on the public Worker origin.

GitHub Actions runs on the dedicated `windows11-tonto-studio` self-hosted runner with label `tonto-studio`, installed outside the repository. A push to `main` installs locked dependencies, checks JavaScript and DSP behavior, runs the browser tests, then deploys the `tonto-studio` Worker. This repository and runner are separate from 2600 Studio.

Cloudflare credentials remain encrypted with Windows DPAPI under `%LOCALAPPDATA%\CodexPrivate\Cloudflare`. The deployment script loads the existing credential store for the current Windows user and clears temporary environment values afterwards. No credentials are committed or stored as GitHub secrets. The runner's authentication files also remain outside this repository.

The runner is a hidden user process, not an installed Windows service. After a reboot, run `./scripts/start-runner.ps1`. Your PC and runner must be online to publish updates; the deployed Worker stays available when the PC is off.

## Verification

DSP tests cover voltage conversion direction, both trigger polarities, open adapters, grounding, microphone fan-out, finite output for factory scenes, matrix summing and overrides, feedback, patch validation and WAV headers. Browser tests exercise live AudioWorklet output, cable gestures, microphone routing, historical conversion, matrix/joystick state, old-patch import, persistence, two-stem recording/export, and responsive layout.

No affiliation with Moog, Buchla, ARP, EMS, Mutable Instruments, Malcolm Cecil or the artists whose techniques informed the source specification.
