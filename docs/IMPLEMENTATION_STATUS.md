# Implementation status — September 23, 2026

## Workbench usability review

- Reviewed the current workbench at phone, tablet, and desktop widths. The
  mobile header now wraps without horizontal scrolling, the preview appears
  before controls, tablet width uses two lower panels, and wide screens retain
  the three-column studio.
- Slider labeling, helper-text size, keyboard focus, accessible names and
  selected states, and the wording of static-balance estimates were improved.
  Dark scrollbars now match the workspace, and the 2D pattern legend and sheet
  caption are easier to scan.
- Raised tiny form and warning text, enlarged key actions, and made the fuselage
  editor keyboard-usable with focus restoration and point nudging. The versions
  and warning popovers also have clearer keyboard behavior and narrow-screen fit.
  See [the UI review](UI_UX_REVIEW_2026-09-23.md) for findings and the remaining
  typography, contrast, zoom, and keyboard audit.

## First flight feedback and measurement loop

- The user built and flew the saved Sky Scout design. Print calibration and tile
  alignment were good. Several roughly 4.29 m throws from around 1.77 m had a
  slight right pull and possible stall halfway through. Nose ballast changes
  clearly affected behavior. The builder confirmed that the flown wing was
  pulled straight through (about 0° dihedral) although the design specifies
  9° per side. Actual build mass, ballast mass, CG, and camber remain unknown;
  see [the evidence review](FIRST_FLIGHT_ANALYSIS_2026-09-23.md).
- Added a Build & flight tests panel. Observations, measured mass/CG/ballast,
  launch height and distance stay with the design JSON, local save, named
  versions, and undo history. The displayed distance/release-height is explicitly
  a throw result, not a steady-glide L/D measurement.
- The uncalibrated numeric glide-ratio and stall-speed heuristics are no longer
  shown as flight predictions. The app still reports geometry, mass and estimated
  static balance. Calibration and a bounded flight simulator remain future work.
- Pattern preview, SVG, and PDF assembly guidance now state the wing forming
  targets and explain that pulling the wing straight through leaves it flat.

## Print and preview feedback (September 23)

- The first printed packet's calibration box measured correctly and its parts
  aligned well, according to the user's print check. Cut-line visibility was
  limited by printer output; a preliminary physical build and flight are now
  recorded above.
- The 3D preview now selects `PCFShadowMap`, as Three.js r185 already does when
  given the deprecated `PCFSoftShadowMap`. This removes the repeated development
  warning without changing the shadow algorithm that was actually rendered.

## Design iteration tools (September 23)

- Workbench-level Undo/Redo now covers sliders, presets, ballast, mode changes,
  imports, local loads, and restored versions. Continuous slider interaction and
  each profile-editor session form one undo step. History is capped at 100 steps
  and lasts for the current browser session.
- The header exposes Undo/Redo buttons and keyboard shortcuts outside the profile
  editors. The Versions panel creates named, numbered snapshots in browser storage,
  lists saved designs, restores them as undoable changes, and supports deliberate
  deletion. Saving a version also updates the current-design save, which reopens on
  the next visit. Existing JSON
  import/export remain available.
- [`BUILD_TEST_FEEDBACK.md`](BUILD_TEST_FEEDBACK.md) provides the print, fit, mass,
  balance, and flight measurements needed to turn a physical prototype into code
  and model corrections. It links NASA's [glider trajectory explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/glider-trajectory-problem/)
  as background for later simulation work.
- Verification for this pass: 182 tests pass, TypeScript and production Webpack
  build pass, and the browser was checked for version save/reload, preset undo,
  the narrow header layout, and the Versions panel at desktop width. Lint has only the two
  pre-existing unused-import warnings. Turbopack's CSS worker could not spawn in
  this execution environment; the production Webpack build completed normally.


## Completed in this pass

- Added lazy-loaded jsPDF vector export from the 2D Patterns view with A4 and US
  Letter landscape options. Geometry shares the SVG part list; no screenshot scaling.
- Each part is tiled at 1:1 with 10 mm overlap, matching registration marks, row and
  column indices, per-part sheet thickness, solid cuts and dashed blue guides.
  Every page has a 50 x 10 mm calibration box and Actual Size / 100% instructions.
- The print packet includes paper assembly instructions, build limitations and the
  current design warnings/errors. Physical paper calibration and prototype testing
  are still required; a PDF export is not manufacturing approval.
- Tests cover tile coverage, distance preservation, negative-coordinate outlines,
  two-axis tiling, narrow-part registration and page-count limits. Generated A4 and
  Letter trainer packets were rendered and visually checked (six pages each).
  PDF page dimensions and calibration path lengths were also verified numerically.

- Wing dihedral now bends around the root camber line so the cambered half-panel
  mean lines meet at the center. Rendering and fit calculations share the same
  assembled half-wing mesh.
- Through-slot relief is generated by clipping that mesh to the fuselage thickness
  and projecting its occupied region into the cut plane. Nominal slot clearance is
  retained; the same relieved opening is used by 3D, SVG, mass and structural checks.
  This verifies final-position clearance, not insertion paths or wood bending.

- Wing blanks now include chordwise mean-camber-line arc-length allowance. Root
  guides extend to the blank chord, while slot geometry retains the formed chord.
  Unswept constant-chord wings without dihedral have a developed mean-line blank;
  other cambered wings are explicitly approximate forming templates, not complete
  surface unfoldings. Springback and stock thickness still need prototype checks.
- Wing material mass uses blank area; aerodynamic area remains the projected
  planform. The formed wing mass center still uses the existing planform-centroid
  approximation. Stock-width checks now include sweep and camber allowance.

- SVG downloads now use explicit millimetre dimensions and matching viewBox units,
  with separate cut and guide groups. Preview backgrounds, labels and rulers are
  excluded from toolpaths. Part thickness is recorded on each cut group.
- Removed the overlapping decorative center-tab mesh: the one-piece wing panels
  already include the root. A flat wing no longer receives a dihedral score guide.
- Pylon geometry is shared by preview, pattern and mass; its mass and first moments
  are now included, and cosmetic bevels no longer enlarge the rendered sheet.
- Manufacturing checks flag narrow/loose slots and short wing-root openings. The
  Aero Dart preset slot now matches its 72 mm root. Stock height checks include
  the actual fuselage contour and integral fin.
- UI/export notes identify general cambered outlines as approximate blanks, warn about
  folded-joint fit, and no longer claim automatic kerf compensation or stock nesting.

- Vertical-fin editing now supports a single upright custom profile, integral or
  separate attachment, and synchronized cut patterns, mass, and JSON documents.
  Integral fins now join the fuselage contour at the tail station, so Tail Position,
  Fin Height, and Fin Root Chord continue to affect preview, cutout, and mass after
  creating a new custom fuselage. The simple UI uses those sliders for an integral
  fin and reserves the dedicated shape editor for separate fins or Advanced STEM.
  Older custom fuselages may already contain hand-edited fin points; they remain
  unchanged and show a message instead of offering ineffective fin size sliders.
- Unsaved design edits now create a separate browser recovery draft. On reopening,
  the user chooses whether to restore it or keep the last explicit save; malformed
  drafts are left untouched until dismissed. Draft writes are paused during the
  choice, and Save plus named versions remain deliberate checkpoints.
- Fuselage mass and centroid now use the remaining sheet after slot subtraction.
  Physics, 3D, SVG and structural checks share physical cut definitions. Overlaps
  are removed once, boundary cuts become notches, and all remaining regions count.
- Stored/imported geometry validates required nested fields, finite numbers,
  positive dimensions, enums and node records before reaching geometry code.
  Legacy documents may still omit optional tail/fin profile types.
- Flight feedback describes estimated static stability instead of promising
  specific crashes or glide trajectories. Telemetry labels identify estimates.

- Fuselage slots are subtracted from the sampled contour before triangulation.
  Rear-exiting slots form notches rather than invalid holes outside the boundary.
  The SVG cut sheet uses the same clipped outlines and enclosed holes.
- Fuselage and horizontal-tail meshes no longer use cosmetic bevels that enlarge
  thin sheets and interfere with slot clearances.
- Cuts that separate the fuselage into pieces now produce a structural error.
- Camera framing measures the assembled model and viewport aspect ratio, including
  custom wing/tail extents, after dimensional edits and on view changes.
- Elliptical wings use a correctly mirrored outline. Standard and custom wings
  share integrated area, MAC, quarter-chord center, and lift-slope calculations.
  Entering custom mode preserves the elliptical shape, mesh, and balance report.
- Cut-sheet bounds account for the sampled fuselage curve's extrema.

Verification: 194 tests, including recovery-draft validation, print tiling and export, flight-record persistence and history, wing-forming targets, analytical flat-wing relief, cambered root seam
continuity, assembled surface samples inside the relieved slot, independent numerical camber arc-length checks,
blank mass versus aerodynamic area, physical SVG units, export parts/escaping,
pylon dimensions/moments, fit warnings, net sheet area/centroid and preset ballast
regressions, malformed imports, triangulated face-area checks across tail slot
lengths, exact tail sheet thickness, disconnected cuts, elliptical/custom agreement,
and camera projection checks in narrow and wide viewports. Browser checks cover
tail chord edits, side view, framing, and structural feedback. The production build
and TypeScript pass. ESLint passes.
Desktop browser checks cover the pattern notes and revised front-view assembly,
including an 8% camber edit with dihedral.
No browser console errors were reported. The in-app browser did not expose an SVG
download event; serializer output is covered by tests, but the saved download still
needs a manual check in a normal browser/CAM application.

## Next implementation sequence

1. **Measure the real build:** record mass, nose ballast, CG, as-built wing
   shape, and repeated throws. The first print's calibration and tile alignment
   passed; the first flight used a flat wing despite a 9° dihedral setting.
   Use these results to decide whether ballast, trim, forming, or the design
   geometry needs revision.
2. **Manufacturing refinements:** verify insertion paths and custom-fin attachment
   edge cases; develop full swept/tapered cambered-surface flattening. Audit wing/tail
   incidence transforms in CG calculations and distinguish fragile bridges from disconnected pieces.
3. **Aerodynamic calibration:** the outline calculations are consistent, but
   quarter-chord aerodynamic center, lift slope, and downwash remain low-order
   models. Use repeatable flight results to bound uncertainty before treating
   any trajectory or performance readout as a prediction.
4. **Educational flight testing:** build a bounded longitudinal simulation after
   establishing its force/moment assumptions; add guided challenges and shareable
   links later. Full VLM/XFOIL, flow simulation and built-up structures remain future work.

Maintenance: npm audit reports the pre-existing moderate Vitest/@vitest/mocker
advisory GHSA-82fw-gwwq-j7x9 in test tooling. Upgrade and verify Vitest separately;
no jsPDF dependency advisory was reported by this audit. Browser PDF controls were exercised in the production build;
the in-app browser's saved-download confirmation remains unavailable.

Older architecture and implementation plans describe historical limitations; this
file records the current next steps.
