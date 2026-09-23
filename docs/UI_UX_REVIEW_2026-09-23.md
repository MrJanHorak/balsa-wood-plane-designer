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

1. **Typography and contrast audit.** Several editor dialogs, validation
   details, version rows, and flight-test fields still use 10–11 px text. Define
   a consistent minimum type scale and measure all normal-text contrast pairs
   against [WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum).
2. **Keyboard and screen-reader walkthrough.** Check dialog focus management,
   warnings popovers, the 2D editor, and viewport controls end to end. The
   labeled camera presets provide an alternative to pointer orbiting, but the
   free-orbit canvas itself has no keyboard interaction.
3. **High-zoom reflow.** Exercise the workbench at 200% and 400% browser zoom,
   including open editors and expanded test records, against the
   [WCAG reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow).
4. **File command clarity.** Save, load, export, and import are still icon-only
   actions in a compact toolbar. A labeled File menu could make their different
   persistence scopes clearer without crowding the desktop header.

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
