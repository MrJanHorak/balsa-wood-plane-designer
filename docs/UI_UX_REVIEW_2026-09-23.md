# Workbench UI review — September 23, 2026

The supplied desktop screenshot shows a capable workspace with a clear division
between design controls, the assembled model, and balance feedback. The color
system distinguishes editing, views, and status, and the model remains the main
visual focus. The first physical build also exposed why estimated balance must
be clearly separated from measured flight behavior.

## Changes made in this pass

| Finding | Improvement |
| --- | --- |
| Three columns became cramped before the desktop breakpoint; a fixed-height mobile shell made lower panels difficult to reach. | The workspace now uses a three-column layout on wide screens, a preview above two panels on tablet widths, and a scrolling preview-first layout on phones. |
| The mobile header required horizontal scrolling and hid design/save status and mode names. | Header groups wrap, presets wrap, and the design status and mode names remain visible. |
| Range sliders lacked a programmatic label and their helper copy was very small. | Sliders now have associated labels and descriptions, larger helper text, and a larger interactive track. |
| Icon-only actions and toggle states were unclear to assistive technology. | File and viewport actions have accessible names; selected presets, views, modes, panels, and overlays expose pressed state. Keyboard focus has a visible outline. |
| “Auto-Balance” and “Expected Behavior” sounded like physical flight predictions. | The action now says it sets design ballast; the supporting line is labeled “Model indication.” Unsupported span and taper promises were replaced with more accurate descriptions. |
| The grid drew attention away from the aircraft. | Grid colors were softened while retaining the orientation cue and toggle. |
| A modified plane still appeared to have an exact preset selected. | Preset highlighting now requires the design to match a preset; otherwise the selector says “Customized.” |

Visual checks were made in the running app at 320 × 640, 390 × 844, 1024 × 768,
and the default 1280 × 720 viewport. At phone widths, the page scrolls normally,
the assembled plane appears before the form controls, and the camera labels fit
without a horizontal toolbar scrollbar. At 1024 px, the model uses the full
width and the two panels sit below it. At 1280 px, the three-column workspace
remains usable. These are layout checks, not a complete accessibility audit.

## Remaining priorities

1. **Finish visual accessibility checks.** A computed-color pass found and fixed
   one normal-text contrast miss. Continue with SVG pattern text, image/gradient
   backgrounds, dense custom-node targets, and a design-wide type scale. Check
   against [WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).
2. **Keyboard and screen-reader walkthrough.** The fuselage, wing, tail, and fin
   editors and warning panel now have keyboard paths; validate announcement
   timing and viewport controls end to end with a screen reader. The
   labeled camera presets offer an alternative to pointer orbiting, but the
   free-orbit canvas itself has no keyboard interaction.
3. **High-zoom reflow.** Short viewport layouts have been checked at 320 × 256
   CSS pixels, but repeat with actual 200% and 400% browser zoom in the target
   browsers, including open editors and expanded test records, against the
   [WCAG reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow).

The [WCAG 2.2 target-size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
is a useful check for the remaining small actions, especially delete controls
inside version and flight-test records.

## Scrollbar and pattern-view follow-up

- The always-dark workbench now declares a dark native color scheme and uses a
  slate thumb against a dark track for page and panel scrollbars. Older browsers
  have a matching WebKit fallback. Scrollbars remain visible and full-size;
  Windows forced-colors mode retains system scrollbar colors.
- The 2D pattern legend now wraps by item instead of splitting labels, and the
  stock-layout caption has stronger contrast against its dark sheet.
- Checked the running 2D view with visible left, center, and right scrollbars.
  The three areas use consistent subdued colors while their thumbs remain easy
  to distinguish from the track.

## Readability and keyboard follow-up

- Increased the small labels and supporting text in build/flight records,
  version rows, validation warnings, fuselage editing, and advanced telemetry.
  The flight form uses two columns for as-built measurements, giving labels and
  inputs more room; record-delete controls have larger hit areas.
- The fuselage shape editor now has a named modal dialog with focus containment
  and return. Edge insertion points and profile points are keyboard controls;
  arrow keys move a focused point by 1 mm, or 5 mm with Shift. Keyboard
  instructions are available in the dialog's Editing tips disclosure. Keeping
  that help collapsed leaves a usable drawing area at 320 px width.
- Named versions focus the name field on open and return focus to the trigger
  on Escape. The warnings panel fits a 320 px viewport and closes with Escape
  or an outside click.
- Live browser checks verified the fuselage point nudge, focus return, expanded
  flight form, version focus, and narrow warnings panel. A full screen-reader
  walkthrough and high-zoom reflow test are still needed.

## Wing, tail, and fin editor follow-up

- Focused outline points now respond to arrow keys in the direction they appear
  on screen. The default step is 1 mm; Shift increases it to 5 mm. Root points
  remain fixed, and tip points retain their span or height position. Moves that
  would invalidate the outline are ignored and do not add an undo step.
- Point labels expose their current coordinates. A short keyboard hint appears
  in each editor header, with fuller guidance in a disclosure. Selected-point
  fields display coordinates to 0.1 mm instead of floating-point noise.
- In the running app, keyboard checks covered wing and tail nudges, Shift+nudge,
  adding a tail point with Enter, moving it spanwise, undo, Escape focus return,
  and the rotated fin direction. Geometry tests cover the shared movement and
  fixed attachment constraints. A full screen-reader walkthrough remains open.

## Short-height reflow and warning-panel follow-up

- At 320 × 256 CSS pixels, the wing and fuselage editor canvases previously
  collapsed to zero height beneath their toolbars. Both dialogs now scroll
  internally and retain a 192 px drawing area; tail and fin use the same wing
  dialog. Keyboard focus remains within each dialog and its canvas can be
  reached by scrolling. The fuselage outline also has an accessible name.
- The warning panel previously extended below that viewport with no way to
  reach its last warnings. Its height is now bounded by the viewport, and the
  region can be focused and scrolled with Page Down. Escape returns focus to
  the warning trigger.
- Browser checks at 320 × 256 verified both canvases, warning scrolling and
  focus return, and no document-level horizontal overflow. A 320 × 640 check
  found no horizontal overflow in the expanded flight-test form. A CSS-size
  simulation does not replace testing real browser zoom or a screen reader.

## File command clarity follow-up

- Replaced the four icon-only persistence buttons with a labeled File control.
  Its actions explain the difference between the browser's current-design save
  and a portable JSON download. The action list opens with focus on Save,
  supports keyboard wrap, closes with Escape, and restores focus to File.
- The popup fits and scrolls at 320 × 256 CSS pixels, stays within a 320 px
  phone viewport, and repositions when the window is resized while open.
  Browser checks covered these states without document-level horizontal scroll.
- The in-app browser did not change its zoom level in response to browser zoom
  shortcuts, so real browser zoom and spoken screen-reader output remain
  unverified. Its accessibility tree shows names and states for the File
  control, its four actions, editor dialogs, and the warning panel.

## Measured contrast and target-size follow-up

- A computed-color pass found the small "Fuselage Profile" scale label at about
  3.8:1 on the default view. It now uses a lighter slate text color. Rechecks of
  sampled educational and Advanced STEM screens, the 2D toolbar, and open File,
  warning, version, wing, and fuselage panels found no calculated normal-text
  pair below 4.5:1. The calculation composites CSS colors but does not assess
  SVG pattern lettering, gradient-clipped text, or every possible design state.
- The default shape-editor dots measured roughly 10–16 CSS pixels across. Their
  visible size is unchanged; transparent interaction circles now track canvas
  resize and measure at least 25 CSS pixels across in desktop and narrow-view
  browser checks. The Editing tips disclosures and narrow warning trigger also
  have larger targets. Keyboard point movement still works after this change.
- Dense custom outlines can put enlarged point targets close together or overlap
  on a phone. A future direct-manipulation review should test those cases with
  touch and consider a point list or another precise-selection control.

## Integral-fin editing follow-up

- New custom fuselage profiles store the editable body points without baking in
  the integral fin. The editor previews the assembled cutout; Fin Height, Fin
  Root Chord, and Tail Position remain active in the Tail panel and update the
  same contour used by 3D, print, and mass calculations.
- Educational mode hides the separate fin-shape editor while the fin is cut with
  the fuselage. Advanced STEM retains custom fin shaping, and a separately cut
  fin still has its own editor and printed part.
- Existing custom fuselage documents may already include a hand-shaped fin in
  their saved nodes. They remain unchanged. The Tail panel identifies those
  designs and directs users to edit the outline in Body rather than presenting
  Fin Height and Fin Root Chord sliders that would have no effect. A future
  migration could split a known fin region into parametric fin and body nodes,
  but should not guess for an arbitrary hand-drawn outline.
