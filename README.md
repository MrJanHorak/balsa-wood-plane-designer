# BalsaPlaneDesigner

Design, preview, print, and test simple interlocking balsa gliders. The workbench
includes parametric and custom-shape editors, a 3D assembly view, 2D cutting
patterns, balance estimates, and full-size PDF print packets.

Use the header's Undo/Redo controls (Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z) to reverse
workbench edits. Save **named versions** before experiments or physical builds;
they remain in this browser and can be restored later. Export design JSON for a
portable backup. For a first build, follow the [feedback record](docs/BUILD_TEST_FEEDBACK.md)
and report measurements alongside the saved design version. Current progress and
remaining limitations are in [implementation status](docs/IMPLEMENTATION_STATUS.md).

## Run locally

Install dependencies with `npm install`, then run `npm run dev` and open
<http://localhost:3000>. Run `npm test` for the geometry, physics, document,
and export checks. The workbench entry point is `src/app/page.tsx`.

Browser storage holds the latest explicitly saved design and named versions.
The latest saved design reopens on a return visit. Undo/Redo history lasts only
for the current session; export JSON for a backup outside this browser.

The print packet and balance estimates still require a real prototype check.
Record your results using [the first-build feedback guide](docs/BUILD_TEST_FEEDBACK.md).
