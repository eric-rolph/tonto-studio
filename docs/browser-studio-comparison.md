# Browser studio comparison — September 25, 2026

This review compared the studios' public documentation with TONTO's running application and source. It is a feature/workflow comparison, not a sound-quality benchmark or a claim of feature parity. No accounts, sample purchases or third-party audio were needed.

## Findings and changes

| Reference | Relevant capability | TONTO before this change | Implemented |
| --- | --- | --- | --- |
| [Audiotool: recording MIDI](https://www.audiotool.com/help/manuals/get-started/record-midi.html) and [editing notes](https://www.audiotool.com/help/manuals/editing/midi.html) | Capture keyboard performances; edit timing, pitch and velocity | Live MIDI and an eight-step voltage sequence, but no performance capture | A 1/2/4/8-bar note loop with editable pitch, start, length and velocity; add/remove notes and quantize starts/ends |
| [Audiotool: automation](https://www.audiotool.com/help/manuals/get-started/automate.html) | Record parameter movements and replay them | Knobs only changed the current sound | Record up to 32 control lanes alongside notes; replay movements, see controls move, remove lanes |
| [BandLab: metronome](https://help.bandlab.com/hc/en-us/articles/115002960274-Using-the-Metronome) | Click and recording count-in | No count-in or monitor click | Accented 4/4 metronome, zero/one/two-bar count-in, click excluded from tape stems |
| [BandLab: MIDI mappings](https://help.bandlab.com/hc/en-us/articles/900000187966-Mapping-your-MIDI-device) | Map hardware knobs/faders to controls | Fixed expression/master CC assignments | Learn an absolute CC by device/channel; correct logarithmic and discrete ranges; persisted browser mappings; individual removal |
| [Audiotool: audio editing](https://www.audiotool.com/help/manuals/get-started/record-audio.html) | Undo edits | No patch edit history | Forty patch snapshots, Undo/Redo buttons and shortcuts, grouped control movements |
| [Webrack](https://webrack.app/) | Modular patching, voltage conventions, scopes and example patches | Substantial overlap already present | Kept TONTO's fixed historical cabinets and existing cable workflow; focused additions on playing and recording |

The new **Notes & motion** panel sits just before Tape and has a rack-navigation link. Its note overview shows pitch versus time; numeric editing remains usable from a keyboard and at small screen widths. MIDI mappings sit in a disclosure beneath it. Patch history sits beside patch memory.

## Behavior and limits

- The performance loop is a shared keyboard-bus phrase, not independent MIDI tracks for each cabinet. Existing mono/duo voice behavior is preserved. Live keys take priority over loop notes; releasing them returns to the phrase. Stop releases loop notes without releasing a physically held key. Panic stops everything as before.
- Record replaces the previous phrase when capture completes. Cancel during count-in leaves it intact. Undo can recover a replaced phrase. Factory patch changes keep the phrase for auditioning; saved patch/session/import loads restore their own data. Save/export finishes an active capture first.
- Length is up to eight bars in 4/4. Tempo is fixed for each transport run. There is no song arrangement, clip bank, overdub mode, MIDI-file import/export, or free-form drawn automation editor yet. Microphone audio is recorded by Tape, not by the note recorder.
- Note boundaries and clicks run in the AudioWorklet using sample frames. Incoming live gestures are timestamped from `AudioContext.currentTime`; this does not compensate for a controller's physical latency. Automation is held between captured changes and passes through the engine's existing smoothing; it is not a drawn interpolation curve.
- Capture allows 512 notes, 32 lanes, 2,048 points per lane and 12,000 total points. Rapid control events are coalesced around a 20 ms interval. Validation rejects invalid event times/values and bounds imported data. Old version-1 patches gain an empty performance loop automatically.
- Master volume, mains frequency and tempo are excluded from recorded automation. Master still controls the monitor level. Click is on a separate third worklet output into the monitor path; the existing stereo wet and mono mic capture inputs cannot record it.
- The eight-step voltage sequencer remains a separate transport and can run with a phrase. It is not automatically phase-locked to the performance loop. An externally clocked voltage sequence retains its external timing.
- MIDI learn accepts ordinary 7-bit absolute CC messages, not relative encoders or high-resolution NRPN. CC64 sustain and CC120–127 system/channel-mode messages are reserved. A learned CC supersedes a built-in assignment only for that device/channel. Browser MIDI device identifiers must remain stable for an existing mapping to match.
- Patch/session files include notes and automation. MIDI mappings are computer/browser preferences, not part of a patch. Undo history is bounded to forty edits, clears on reload, and does not include tape audio or controller mappings. Undo stops synth/loop playback while leaving tape takes intact.

## Further gaps

[Soundation's studio tools](https://next.soundation.com/studio-tools) also cover audio/MIDI editing, automation and collaboration. Full DAW workflows still exceed this update: multi-clip song arrangement, independent instrument tracks, detailed tape trimming/fades, cloud collaboration, and automatic audio-session recovery. Webrack's add/remove module library is a different rack model from TONTO's fixed cabinet collection. Those changes need their own design and persistence work; they are not represented here as implemented.

## Verification

New Node tests cover backwards-compatible patch/session round-trips, input bounds, quantization, exact count-in/note timing at 44.1/48/96 kHz, loop boundaries, live-note priority, held-note release, real DSP output, automation resets, controller scaling and history branching. New browser tests exercise recording, sustain, editing, audible replay, count-in cancellation, click exclusion from recorded samples, learn/persist/remove mappings, undo/redo, file round-trips, factory sound auditioning and mobile widths.

Hardware controller behavior is simulated in browser tests; a physical MIDI keyboard was not available for hands-on verification. Timing tests establish the software schedule, not measured hardware latency or analog waveform equivalence.
