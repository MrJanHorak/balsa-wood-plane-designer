# Implementation status — September 22, 2026

## Completed in this pass

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

Verification: 112 tests, including triangulated face-area checks across tail slot
lengths, exact tail sheet thickness, disconnected cuts, elliptical/custom agreement,
and camera projection checks in narrow and wide viewports. Browser checks cover
tail chord edits, side view, framing, and structural feedback. The production build
and TypeScript pass. Four pre-existing unused-variable lint warnings remain.

## Next implementation sequence

1. **Vertical-fin editor:** reuse the point-editing interactions for a single
   upright profile. Define how an integral fin joins a custom fuselage before
   adding freeform edits; synchronize its mass, extrusion, cut pattern, and imports.
2. **Manufacturing and mass consistency:** subtract the actual removed slot area
   from fuselage mass/centroid (currently gross sheet-contour mass), distinguish
   disconnected pieces from fragile bridges, and recheck preset ballast.
3. **Export verification:** cover open slots, acute corners, stock-sheet fit, and
   kerf compensation with SVG dimensional checks and a printable scale reference.
4. **Aerodynamic calibration:** the outline calculations are consistent, but
   quarter-chord aerodynamic center, lift slope, downwash, and stall/glide estimates
   are still low-order models. Validate them with measured flight results before
   treating the readouts as predictive simulation.

Older architecture and implementation plans describe historical limitations; this
file records the current next steps.
