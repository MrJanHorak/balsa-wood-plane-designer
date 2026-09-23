# Implementation status — September 22, 2026

## Completed in this pass

- Vertical-fin editing now supports a single upright custom profile, integral or
  separate attachment, and synchronized cut patterns, mass, and JSON documents.
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

Verification: 144 tests, including net sheet area/centroid and preset ballast
regressions, malformed imports, triangulated face-area checks across tail slot
lengths, exact tail sheet thickness, disconnected cuts, elliptical/custom agreement,
and camera projection checks in narrow and wide viewports. Browser checks cover
tail chord edits, side view, framing, and structural feedback. The production build
and TypeScript pass. Three pre-existing unused-variable lint warnings remain.

## Next implementation sequence

1. **Manufacturing consistency:** verify central tab and slot fits, custom-fin
   attachment edge cases, and cambered-sheet flattening. Audit pylon mass and
   placement transforms; distinguish disconnected pieces from fragile bridges.
2. **Buildable output:** verify SVG dimensions, separate fit clearance from kerf,
   add calibrated 1:1 tiled PDFs and assembly instructions, then grain-aware layout.
   Complete a physical cut-and-assemble trial before manufacturing sign-off.
3. **Aerodynamic calibration:** the outline calculations are consistent, but
   quarter-chord aerodynamic center, lift slope, downwash, and stall/glide estimates
   are still low-order models. Validate them with measured flight results before
   treating the readouts as predictive simulation.
4. **Educational flight testing:** build a bounded longitudinal simulation after
   establishing its force/moment assumptions; add guided challenges and shareable
   links later. Full VLM/XFOIL, flow simulation and built-up structures remain future work.

Older architecture and implementation plans describe historical limitations; this
file records the current next steps.
