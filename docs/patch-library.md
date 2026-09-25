# Patch library

157 entries: 80 console patches (including eight performance phrases), all 64 patches from 2600 Studio, and 13 reference studies. This adds 62 console patches and 43 ARP patches to the existing collection. The intentional Empty patch has no sound preview.

Open **Browse library** beside Patch memory. Search by sound, instrument, or technique; combine category, instrument and play-mode filters. Results show 24 entries per page. **Favorite** adds a patch to a collection kept in this browser.

Select a result to read its description, playing instructions and explicit cable routes. **Preview** renders a short phrase locally in a separate worker and audio context, without replacing your patch or requesting microphone access. Microphone previews use a generated test signal, not a vocal sample. Stop, another selection, or closing the library cancels the preview. **Load patch** installs the settings; enable audio and microphone as needed to play them.

**Save current patch / edit memory** stores the current settings with a name, category, tags and notes. To rename or annotate an existing saved memory, select it and choose **Edit name & notes**. This preserves its saved sound. **Use current patch** switches back to capturing the instrument. Only user memories can be deleted; factory entries stay available. Saved patches and favorites belong to this browser and origin.

**Download bank** exports My patches, Favorites, or the current search results to a `.patchbank.json` file. Banks hold settings, routing, metadata and supported performance data; they do not include tape audio or MIDI mappings. Use Save session for recordings. Bank import validates the complete collection before saving, adds numbered suffixes to duplicate names, and leaves existing memories intact. One bank supports 1–256 entries, up to 25 MB. Storage errors are shown without adding an unsaved memory to the list.

These are original designs for the browser engines and labeled reference studies. The new patches do not claim to recover an artist's settings or match a hardware recording. Previews are synthesized at 48 kHz. Regression tests render every playable entry and check finite, bounded, non-silent output; they do not establish analog equivalence.

Sound patches preserve the existing Notes & motion phrase. Entries marked **Performance** replace it with their included notes and automation; the details panel states this before loading. Press **Play loop** to perform the phrase. Voltage-sequence patches contain their own rows, step states and clock settings. Saved memories restore their own complete performance data.

TONTO imports 2600 Studio banks into its ARP cabinet, retaining controls and internal cables. Multi-cabinet TONTO banks cannot be opened in the standalone 2600.

## Catalog

| Patch | Category | Instrument | Play mode |
| --- | --- | --- | --- |
| 01 / Living bass | Cross-cabinet | Cross-cabinet | Keys |
| 02 / West coast cycles | Texture | Buchla 200 | Drone |
| 03 / Matrix runner | Sequence | EMS VCS3 | Sequence |
| 04 / Voice & circuit | Voice | ARP 2600 | Microphone |
| 05 / Resonant fragments | Texture | Eurorack | Keys |
| 06 / Cross-cabinet lead | Cross-cabinet | Cross-cabinet | Keys |
| 07 / Voice through grains | Voice | Eurorack | Microphone |
| 08 / ARP warm ensemble | Pad | ARP 2600 | Keys |
| 09 / Ground & scale study | Study | Cross-cabinet | Study |
| 10 / Empty patch | Study | Cross-cabinet | Study |
| 11 / Three-row sequence | Sequence | Moog 55 | Sequence |
| 12 / Divided cabinet duet | Sequence | Cross-cabinet | Sequence |
| 13 / Switched voltage melody | Sequence | Moog 55 | Sequence |
| 14 / Mixed oscillators, separate envelope | Cross-cabinet | Cross-cabinet | Keys |
| 15 / Filter-bank keys | Keys | Spectral studio | Keys |
| 16 / Clocked high-pass percussion | Percussion | Spectral studio | Sequence |
| 17 / Microphone vocoder | Voice | Spectral studio | Microphone |
| 18 / Cross-cabinet spectral rhythm | Sequence | Cross-cabinet | Sequence |
| Moog / round sub | Bass | Moog 55 | Keys |
| Moog / hollow reed | Bass | Moog 55 | Keys |
| Moog / driven pluck | Bass | Moog 55 | Keys |
| Moog / brass rise | Lead | Moog 55 | Keys |
| Moog / soft drawbars | Keys | Moog 55 | Keys |
| Moog / slow ladder | Pad | Moog 55 | Keys |
| Moog / filter breathing | Texture | Moog 55 | Drone |
| Moog / pulse-rate FM | Experimental | Moog 55 | Keys |
| Buchla / wooden strike | Percussion | Buchla 200 | Keys |
| Buchla / bent bell | Keys | Buchla 200 | Keys |
| Buchla / low marimba | Keys | Buchla 200 | Keys |
| Buchla / folded reed | Lead | Buchla 200 | Drone |
| Buchla / slow voltage garden | Texture | Buchla 200 | Drone |
| Buchla / membrane | Percussion | Buchla 200 | Keys |
| Buchla / audio-rate gate | Experimental | Buchla 200 | Drone |
| Buchla / folded bass | Bass | Buchla 200 | Keys |
| EMS / sine flute | Lead | EMS VCS3 | Keys |
| EMS / rubber pulse | Bass | EMS VCS3 | Keys |
| EMS / ring strike | Percussion | EMS VCS3 | Keys |
| EMS / two-oscillator brass | Lead | EMS VCS3 | Keys |
| EMS / bubbling FM | Experimental | EMS VCS3 | Drone |
| EMS / joystick panorama | Texture | EMS VCS3 | Keys |
| EMS / noise puff | Percussion | EMS VCS3 | Keys |
| EMS / spring feedback | Experimental | EMS VCS3 | Keys |
| Eurorack / dry FM bass | Bass | Eurorack | Keys |
| Eurorack / harmonic pluck | Keys | Eurorack | Keys |
| Eurorack / metal tick | Percussion | Eurorack | Keys |
| Eurorack / glass resonator | Keys | Eurorack | Keys |
| Eurorack / octave grain cloud | Texture | Eurorack | Keys |
| Eurorack / glass fragments | Texture | Eurorack | Keys |
| Eurorack / soft harmonic tail | Pad | Eurorack | Keys |
| Eurorack / FM movement | Experimental | Eurorack | Keys |
| Buchla → Moog / double envelope | Cross-cabinet | Moog 55 | Keys |
| ARP → Buchla / triangle gate | Cross-cabinet | Buchla 200 | Keys |
| EMS → grains / ring trail | Cross-cabinet | Eurorack | Keys |
| Moog → filter bank / vowel bands | Cross-cabinet | Spectral studio | Keys |
| Noise → ladder / rough oscillator | Cross-cabinet | Moog 55 | Keys |
| Buchla → band-pass / bright strike | Cross-cabinet | Spectral studio | Keys |
| Mixed oscillators / inverted color | Cross-cabinet | Moog 55 | Keys |
| Buchla × ARP / spectral percussion | Cross-cabinet | Spectral studio | Keys |
| Voice / ladder follower | Voice | Moog 55 | Microphone |
| Voice / low-pass gate | Voice | Buchla 200 | Microphone |
| Voice / low vocoder carrier | Voice | Spectral studio | Microphone |
| Voice / narrow radio band | Voice | Spectral studio | Microphone |
| Voice / falling fragments | Voice | Eurorack | Microphone |
| Voice / bright pulse vocoder | Voice | Spectral studio | Microphone |
| Sequence / octave ladder | Sequence | Moog 55 | Sequence |
| Sequence / pentatonic strikes | Sequence | Buchla 200 | Sequence |
| Sequence / metal steps | Sequence | Eurorack | Sequence |
| Sequence / sliding minor | Sequence | Moog 55 | Sequence |
| Sequence / band-pass ticks | Sequence | Spectral studio | Sequence |
| Sequence / divided mallets | Sequence | Moog 55 | Sequence |
| Sequence / pendulum resonator | Sequence | Eurorack | Sequence |
| Sequence / bounded random | Sequence | Moog 55 | Sequence |
| Phrase / opening bass | Performance | Moog 55 | Performance |
| Phrase / changing bells | Performance | Buchla 200 | Performance |
| Phrase / granular descent | Performance | Eurorack | Performance |
| Phrase / slow intervals | Performance | Moog 55 | Performance |
| Phrase / spectral accents | Performance | Spectral studio | Performance |
| Phrase / pulse through ladder | Performance | Moog 55 | Performance |
| Phrase / uneven strikes | Performance | Buchla 200 | Performance |
| Phrase / shifting macro | Performance | Eurorack | Performance |
| 2600 / Init · classic lead | Study | ARP 2600 | Keys |
| 2600 / Droid · voice + circuit | Experimental | ARP 2600 | Microphone |
| 2600 / Droid · questioning chirp | Experimental | ARP 2600 | Keys |
| 2600 / Droid · sample & chatter | Experimental | ARP 2600 | Keys |
| 2600 / Warm · three oscillators | Pad | ARP 2600 | Keys |
| 2600 / Metal · ring percussion | Percussion | ARP 2600 | Keys |
| 2600 / Voice · filter follower | Voice | ARP 2600 | Microphone |
| 2600 / Bass · plucked saw | Bass | ARP 2600 | Keys |
| 2600 / Bass · sine sub | Bass | ARP 2600 | Keys |
| 2600 / Bass · resonant pulse | Bass | ARP 2600 | Keys |
| 2600 / Lead · pulse width | Lead | ARP 2600 | Keys |
| 2600 / Lead · portamento | Lead | ARP 2600 | Keys |
| 2600 / Lead · duophonic | Lead | ARP 2600 | Keys |
| 2600 / Keys · pluck | Keys | ARP 2600 | Keys |
| 2600 / Keys · electric piano | Keys | ARP 2600 | Keys |
| 2600 / Pad · slow strings | Pad | ARP 2600 | Keys |
| 2600 / Percussion · kick | Percussion | ARP 2600 | Keys |
| 2600 / Percussion · snare | Percussion | ARP 2600 | Keys |
| 2600 / Percussion · hi-hat | Percussion | ARP 2600 | Keys |
| 2600 / Modulation · random filter | Modulation | ARP 2600 | Keys |
| 2600 / Modulation · siren | Modulation | ARP 2600 | Keys |
| 2600 / Bass · rubber pulse | Bass | ARP 2600 | Keys |
| 2600 / Bass · octave anchor | Bass | ARP 2600 | Keys |
| 2600 / Bass · rounded triangle | Bass | ARP 2600 | Keys |
| 2600 / Bass · hollow reed | Bass | ARP 2600 | Keys |
| 2600 / Bass · driven unison | Bass | ARP 2600 | Keys |
| 2600 / Bass · clock gurgle | Bass | ARP 2600 | Keys |
| 2600 / Bass · sine knock | Bass | ARP 2600 | Keys |
| 2600 / Bass · lagged pulse | Bass | ARP 2600 | Keys |
| 2600 / Lead · round flute | Lead | ARP 2600 | Keys |
| 2600 / Lead · nasal solo | Lead | ARP 2600 | Keys |
| 2600 / Lead · switching waves | Lead | ARP 2600 | Keys |
| 2600 / Lead · fifth brass | Lead | ARP 2600 | Keys |
| 2600 / Lead · double pulse | Lead | ARP 2600 | Keys |
| 2600 / Lead · singing ring | Lead | ARP 2600 | Keys |
| 2600 / Lead · upper answer | Lead | ARP 2600 | Keys |
| 2600 / Lead · lagged vibrato | Lead | ARP 2600 | Keys |
| 2600 / Keys · wooden key | Keys | ARP 2600 | Keys |
| 2600 / Keys · glass tine | Keys | ARP 2600 | Keys |
| 2600 / Keys · muted clav | Keys | ARP 2600 | Keys |
| 2600 / Keys · soft organ | Keys | ARP 2600 | Keys |
| 2600 / Keys · spring pluck | Keys | ARP 2600 | Keys |
| 2600 / Keys · soft mallet | Keys | ARP 2600 | Keys |
| 2600 / Percussion · low tom | Percussion | ARP 2600 | Keys |
| 2600 / Percussion · rim click | Percussion | ARP 2600 | Keys |
| 2600 / Percussion · noise cymbal | Percussion | ARP 2600 | Keys |
| 2600 / Percussion · soft shaker | Percussion | ARP 2600 | Keys |
| 2600 / Percussion · laser drum | Percussion | ARP 2600 | Keys |
| 2600 / Percussion · clocked rattle | Percussion | ARP 2600 | Sequence |
| 2600 / Pad · slow fifths | Pad | ARP 2600 | Keys |
| 2600 / Pad · breath and triangle | Pad | ARP 2600 | Keys |
| 2600 / Pad · moving pulse widths | Pad | ARP 2600 | Keys |
| 2600 / Texture · filtered wind | Texture | ARP 2600 | Drone |
| 2600 / Texture · slow tide | Texture | ARP 2600 | Drone |
| 2600 / Texture · random stars | Texture | ARP 2600 | Drone |
| 2600 / Texture · low beating drone | Texture | ARP 2600 | Drone |
| 2600 / Voice · clock tremolo | Voice | ARP 2600 | Microphone |
| 2600 / Voice · soft envelope filter | Voice | ARP 2600 | Microphone |
| 2600 / Voice · metallic carrier | Voice | ARP 2600 | Microphone |
| 2600 / Voice · dry and ring blend | Voice | ARP 2600 | Microphone |
| 2600 / Experimental · FM bell | Experimental | ARP 2600 | Keys |
| 2600 / Experimental · stepped sine gates | Experimental | ARP 2600 | Sequence |
| 2600 / Experimental · envelope pulse sweep | Experimental | ARP 2600 | Keys |
| 2600 / Experimental · filter sidebands | Experimental | ARP 2600 | Keys |
| Buchla / Easel percussion study | Reference study | Buchla 200 | Keys |
| Moog / isolated saw | Reference study | Moog 55 | Keys |
| Moog / envelope bass | Reference study | Moog 55 | Keys |
| Buchla / low-pass gate strike | Reference study | Buchla 200 | Keys |
| Buchla / inharmonic FM | Reference study | Buchla 200 | Keys |
| ARP / two-oscillator bass | Reference study | ARP 2600 | Keys |
| ARP / noise through resonant filter | Reference study | ARP 2600 | Keys |
| EMS / filter sequence | Reference study | EMS VCS3 | Sequence |
| Eurorack / dry FM voice | Reference study | Eurorack | Keys |
| Buchla → Moog / folded lead | Reference study | Cross-cabinet | Keys |
| ARP → Buchla / pulse percussion | Reference study | Cross-cabinet | Keys |
| ARP + Buchla / three-envelope kick | Reference study | Cross-cabinet | Keys |
| ARP × Buchla / ring modulation | Reference study | Cross-cabinet | Keys |
