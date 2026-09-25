# Studio audit — September 25, 2026

This audit covers TONTO Studio and the shared code used by 2600 Studio. It tests implemented behavior; it is not a certification of analog hardware equivalence.

## Verified faults and repairs

| Area | Reproduced behavior | Repair |
| --- | --- | --- |
| Note priority | An unrelated note-off retriggered the last held TONTO note. Releasing a held note could also retrigger it. | Ignore unheld IDs; remaining notes change pitch without a new envelope attack. |
| MIDI removal | Disconnecting one keyboard could leave its sustained notes or interrupt other inputs. Its sustain state could remain active. | Track connected inputs and pedal owners; remove only the disconnected input's notes and pedals. Local focus loss releases computer/touch keys without stopping MIDI. |
| External envelopes | A keyboard pitch change retriggered envelopes patched to an independent clock. A sustained ARP envelope jumped from about 0.30 to 0.65 in the reproduction. | Keyboard retriggers only apply when the gate source is the keyboard. Clock and microphone gates keep control of their envelopes. |
| ARP inside TONTO | Lower/upper duo pitches both used the last note. Stereo spring output was collapsed to mono. Global octave did not reach both duo voices. | Forward both held-note extremes; apply global octave to both pitches; retain left/right output and the ARP pan stage. |
| Tape saturation | Zero saturation still mapped an input of 0.2 to about 0.259. | Zero saturation now has a linear transfer curve. Tape filtering and resampling are separate processes. |
| Recording suspend | Audio could suspend before the capture worklet flushed its final samples. | Await the capture acknowledgement before suspending or saving a session. |
| Tape completion | A long muted take kept transport running after the audible take ended. | Count unfinished, unmuted layers; preserve live unmute while other layers run. |
| Take limit | Imports completing together, or importing during the eighth recording, could exceed eight takes. | Reserve the active recording's slot and recheck after asynchronous decoding. Import accepts mono/stereo audio. |
| Signal display | 2600's output meter omitted tape and the mic trace covered a different time window. | Read the post-master analyser for the output meter, align analyser lengths, clear stopped meters. |
| Sample-rate response | Fixed per-sample ARP DC and spring coefficients changed response at different rates. | Normalize those coefficients to the existing 48 kHz response. Tested 50 Hz output response varies by less than 1% at the three tested rates. |
| Source activation | A cabinet at zero output level could sleep even when a processing cabinet used its normal connection. | Follow normal and explicit dependencies when deciding which cabinets must run. |

Panic also cancels pending browser-key/pointer starts. Reference rendering no longer invents a nonexistent utility level parameter; automatic fitting excludes discrete processor/scale/root choices.

## Added processing cabinet

**Spectral studio** supplies processing stages that were missing from the rack. There are now 181 jacks, including 90 inputs.

- Fixed filter bank: twelve Q=3 band-pass stages at 125, 175, 250, 350, 500, 700, 1000, 1400, 2000, 2800, 4000 and 5600 Hz, plus low-pass at 88 Hz and high-pass at 8 kHz. Fourteen independent level faders.
- Multimode filter: simultaneous low-, band- and high-pass outputs; cutoff 20 Hz–16 kHz, Q 0.5–8, cutoff CV at 1 V/octave.
- Vocoder: twelve rectified, smoothed analysis envelopes shape matching carrier bands. Attack is 5 ms; release is adjustable from 10 ms to 1 s. Sensitivity sets envelope gain. Formant shift moves carrier-band centers ±12 semitones, extended to ±24 with CV. Band faders affect both the bank and vocoder.
- Monitor selects the cabinet's audible output. All five processing taps remain separately patchable. The twelve meters display analysis-envelope activity.

Normal connections are Moog voice → Filter audio, MIC OUT → Modulator, and Moog saw → Carrier. Any explicit patch replaces its normal, including cross-cabinet audio or microphone patching. A carrier and an active modulator are both necessary for vocoded output. The carrier is a free-running oscillator; keys change its pitch.

Try **15 / Filter-bank keys**, **16 / Clocked high-pass percussion**, **17 / Microphone vocoder**, and **18 / Cross-cabinet spectral rhythm**. Patch 17 needs microphone permission and speech; patch 18 demonstrates a Buchla modulator and ARP carrier without a microphone.

The original [Moog 1972 catalog](https://moogfoundation.org/wp-content/uploads/1972-Moog-Music-Catalog-1.pdf) documents fixed filter banks and a high-pass module. The filters here use an original implementation of the [W3C Audio EQ Cookbook equations](https://www.w3.org/TR/audio-eq-cookbook/). They are functional digital stages, not measured 914 or historical vocoder circuit models.

## Complete session files

Both studios now offer **Save session** and **Open session** in the tape transport. A session includes the patch, tape coloration/transport settings, and every take's synth/voice samples, rate, offset, level, mute and reverse settings. Saving finishes an active recording first. Opening asks before replacing current recordings, including a recording in progress.

The `.synthsession` container stores little-endian float32 planar audio without reducing its precision. Mixed stem sample rates are retained. Files are local downloads; neither saving nor opening uploads audio. Each file belongs to the studio that saved it. Patch JSON still transfers controls/routes only; WAV exports remain the interchange format for other audio software.

The loader validates version, studio ID, dimensions, duration, exact byte lengths and finite samples before replacing state. Limits are eight takes, three minutes per buffer, mono/stereo, 8–192 kHz and 1 GB per file. Large sessions need substantial browser memory. Save explicitly before closing; there is no automatic recording backup.

## Verification

Commands: `npm run check` and `npm run test:browser` in each repository.

| Suite | TONTO | 2600 |
| --- | ---: | ---: |
| Node DSP, engine and session checks | 43 | 20 |
| Chromium browser checks | 26 | 17 |
| Total | 69 | 37 |

The 106 checks cover factory presets, oscillator pitch, routing/conversion, matrix behavior, feedback, three-row sequencing and external clocks, filter responses, recording/WAV export, mouse/touch/keyboard patching, fake MIDI hot-unplug and sustain, synthetic microphone processing, denied permission, saved-session round trips after reload, corrupted files, post-master meters and responsive layouts. New spectral controls were checked at widths 390, 768, 1000 and 1600 pixels. Seeded extreme-control/feedback tests exercise 44.1, 48 and 96 kHz and reject nonfinite or unbounded final output.

Public-origin smoke checks are performed after deployment; localhost-only diagnostics must remain absent on the public sites. Both GitHub Actions workflows now run browser tests before deploying from the Windows PC.

## Performance and limits

DSP benchmarking exposed a real limit: all cabinets at 96 kHz took longer to calculate than the audio's duration. Caching repeated coefficients and removing per-sample allocations improved performance. Live contexts now request 48 kHz; browsers handle output-device conversion. Offline reference renders can still use higher rates.

Representative warm Node measurements on this PC, milliseconds to calculate one second of audio:

| Patch | 48 kHz before | 48 kHz after | 96 kHz after |
| --- | ---: | ---: | ---: |
| Moog lead | 235 | 179 | 334 |
| Microphone vocoder | 303 | 193 | 507 |
| All cabinets active | 747 | 567 | 1631 |

These short CPU measurements are indicative, not browser deadline, dropout or end-to-end latency certification. The 96 kHz all-cabinet case remains unsuitable for real-time use on this test PC. Background load and slower devices can affect 48 kHz performance too.

Physical MIDI hardware, the user's microphone/audio interface, Safari/Firefox, long recording sessions near the memory limit, and analog calibration were not tested. Synthetic microphone and MIDI checks exercise application behavior without certifying those devices. Oscillator spectra, nonlinear filter behavior, noise color, spring dispersion and tape hysteresis still need measured hardware comparisons. Tape loops retain a short transport gap. The sequencer remains eight stages without MIDI clock/recording or chained patterns. Frequency shifting, phasing and quadraphonic routing remain future work.


## Subsequent completion update

The [session and performance update](studio-completion.md) replaces the transport-gap and future-work notes above. It adds shared timing/MIDI clock, independent parts and chains, recovery, editing, high-resolution WAV, frequency shifting, phasing and quad routing. Both studios passed three-minute capture/recovery/export stress tests. Physical signal-path validation and analog hardware equivalence remain unverified.
