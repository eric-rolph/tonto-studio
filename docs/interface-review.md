# Interface review — September 25, 2026

The changes retain the rack layout, wood frames and individual instrument palettes. They address readability and repeated interaction patterns.

- Cabinet control labels increase from 9 to 10 px; jack labels increase from 8 to 10 px. Working values use brighter text and tabular numerals. Light-panel secondary text has more contrast.
- Warm amber identifies the main starting action. Running audio, microphone, MIDI access, sequencing and tape playback use muted green. Recording uses a separate terracotta state, with text and pressed-state semantics retained.
- Buttons and selectors have more consistent heights. Mobile patch selectors occupy a complete row, with aligned actions underneath. Keyboard focus remains visible on both light and dark cabinets.
- Rack navigation stays above the cabinet being viewed. It follows section position, preserves deliberate selection between adjacent cabinets, and scrolls horizontally on narrow screens. Section headings leave room for the navigation bar.
- Patch/audio imports use real buttons with keyboard activation. The reference lab receives the same import behavior and a fix for header overflow at 320 px.

Validation: before/after screenshots, layout and clipping checks at 320, 390, 768, 1000, 1440 and 1920 px, and keyboard tests for imports and section navigation. Sampled cabinet-label contrast ratios range from 4.87:1 to 7.34:1; this is a targeted measurement, not a complete accessibility certification. The suite contains 43 Node checks and 29 browser checks; 2600 Studio has 20 Node and 18 browser checks.

The separate `interface.css` and `interface.js` files hold the refinements so cabinet DSP and saved patch formats remain independent of presentation. Reduced-motion preferences disable button transitions and smooth scrolling.
