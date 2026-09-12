# Architecture Review — BalsaPlainSite

Status as of this review. Written as the first deliverable of the "long-term
platform" evolution plan — see the 20-phase product vision prompt in project
history. This document covers **Phase 1** (repository/architecture analysis)
and the "smallest refactor" from **Phases 3–5, 7** (dedup sources of truth,
canonical geometry engine, fix known inconsistencies, add real tests) that
was implemented alongside it.

## 1. Current architecture (before this review)

Single data model, three independent consumers:

```
        GliderDesign (src/types/glider.ts)
                |
    +-----------+------------+
    |           |            |
    v           v            v
extrusion3d  patterns2d   massBalance/
 (3D render)  (2D cut      stability
              patterns)    (physics)
```

There was no canonical geometry layer. Each of the three consumers
independently re-derived wing/tail/fin planform shape, area, and centroid
from raw chord/span/sweep numbers, using hand-written formulas. This is the
condition the product-vision prompt calls out directly: *"The 3D renderer
should NOT calculate its own aircraft geometry independently... the physics
engine should NOT reconstruct geometry differently from the renderer."*
That was exactly the previous state.

`GliderDesign` (the de facto `PlaneDesign`) currently has **no
`schemaVersion`, no `provenance`, no separate `manufacturing`/`simulation`
sections** — it's a flat bag of `fuselage` / `wing` / `horizontalStabilizer`
/ `verticalStabilizer` / `material`. It has served well for a single-user,
single-session parametric tool, but it does not yet support the versioning,
forking, or save/load phases of the product vision. See §5.

## 2. Duplicated sources of truth found (Phase 3)

| Duplicate | Which one geometry actually used | Resolution |
|---|---|---|
| `wing.incidenceDeg` vs `fuselage.wingSlot.angleDeg` | `wingSlot.angleDeg` (geometry silently ignored `wing.incidenceDeg`) | Removed `wing.incidenceDeg` entirely. Slot angle is the single source of truth — it's a manufacturing/mounting property, not a separate aerodynamic input, so this collapses cleanly rather than needing two reconciled values. |
| `horizontalStabilizer.incidenceDeg` vs `fuselage.tailSlot.angleDeg` | `tailSlot.angleDeg` | Same fix. The "Tail Angle Trim" UI slider was bound to the dead field — this was a real, user-visible bug (slider had no effect), found via user testing, not just code audit. |
| Wing/tail/fin planform points, area, and centroid | Computed three separate ways (3D shape builder, 2D path builder, physics polygon math), each hand-derived | Extracted to `src/geometry/core.ts` — see §3. All three consumers now call the same functions. |
| Rectangular wing's effective tip chord | 3D and 2D geometry overrode `tipChordMm → rootChordMm`; physics read `tipChordMm` raw | Added `getEffectiveTipChordMm()` in `types/glider.ts` as the one place this policy lives; all four read sites use it. |

## 3. Canonical geometry engine (Phase 4)

New file: `src/geometry/core.ts`. Pure functions, no rendering/physics/app
assumptions:

- `polygonArea`, `polygonCentroid`, `calculateBoundingBox` — generic Shoelace-formula primitives.
- `calculateMAC` — standard trapezoid MAC closed form (documented as an approximation for non-trapezoidal planforms — see §5 limitations).
- `calculateTrapezoidPlanformPoints` / `calculateEllipticalPlanformPoints` — the two planform shapes the app currently supports.
- `calculateWingPlanformPoints(kind, ...)` — the dispatcher every consumer calls.

`extrusion3d.ts` (3D), `patterns2d.ts` (2D export), and `massBalance.ts` /
`stability.ts` (physics) all now call into this module instead of
re-deriving shapes. A wing, tail, or fin's shape is defined **once**.

## 4. Geometry/physics inconsistencies found and fixed (Phase 5)

1. **Delta wing was geometrically identical to a tapered wing.** Nothing
   forced a delta's tip toward a point; it just used whatever `tipChordMm`
   was stored. Fixed via `getEffectiveTipChordMm` forcing a near-point tip
   for `'delta'`.
2. **Elliptical wing's true (curved) area was never used by physics.**
   `computeSurfaceAerodynamics` always assumed a straight-tapered trapezoid
   for area/aspect-ratio, understating an elliptical wing's actual area —
   so the wing could be weighed correctly (mass used the real shape) but
   *reported* (wing loading, stall speed estimate) using the wrong area.
   Fixed in `stability.ts` by overriding `wingAero.areaMm2`/`aspectRatio`
   with the canonical polygon area post-hoc. MAC/AC position remain the
   documented trapezoid approximation even for elliptical wings — a true
   closed-form MAC for a curved planform is out of scope for now (see §5).
3. **Integral vertical fin was invisible and massless.** When
   `verticalStabilizer.isIntegralWithFuselage` was true, no code ever drew
   it into the fuselage silhouette or counted its mass anywhere — it just
   vanished. Fixed by folding the fin's shape into the fuselage polygon
   (`insertIntegralFinBump` in `massBalance.ts`) so it's visible in the 3D
   view, cut correctly in the 2D pattern, and its mass is counted exactly
   once (as part of `fuselageGrams`, explicitly not double-counted in the
   separate-fin branch).
4. **Wing/tail/fin centroid used an ad-hoc approximate formula** instead of
   the polygon's true centroid — most visible on swept wings, where the
   old formula understated the sweep-induced aft shift of the centroid
   (found ~14.5mm local error on the 16°-swept delta preset). Fixed by
   computing `polygonCentroid` on the actual canonical planform points.
5. **Bottom/top-saddle wing mounts had no geometric effect** — selecting a
   different mount type didn't move the wing or reshape the fuselage, so
   all four mount types looked identical. Fixed (prior session): mount-type
   selection now sets a sensible default wing height, the Y-position slider
   allows negative values, and the fuselage belly/spine dips or rises
   generically to meet the wing regardless of profile style.
6. **2D cut-sheet layout used hardcoded pixel offsets**, so parts could be
   clipped off the visible sheet for larger designs. Fixed (prior session)
   with a layout pass that measures each part's real bounding box and
   stacks them dynamically.

**Ripple effect worth noting explicitly:** each of fixes #1, #2, and #4
above changes the computed wing area, mass, or CG for at least one preset,
because those presets' ballast values were tuned against the previous
(incorrect) physics. Every fix in this review's session required retuning
1–3 presets' `noseBallastGrams` back to their solver-recommended value to
restore an "optimal" static margin. This is expected — the presets were
never wrong on purpose, they were tuned against buggy math — but it means
**any future geometry/physics correction should be followed by an
`npx tsx src/physics/verify.ts` pass over all presets**, not just a
type-check.

## 5. Known limitations (not fixed, by design — out of scope for this pass)

- **MAC and aerodynamic-center location are still the trapezoid closed
  form**, applied even to elliptical planforms. Area/mass/CG are exact;
  MAC/NP position is an approximation for curved planforms. A true
  closed-form (or numerically integrated) MAC for arbitrary planforms is a
  reasonable candidate for a future, narrowly-scoped phase.
- **`GliderDesign` has no schema versioning, provenance, or
  manufacturing/simulation sub-objects** — see §6.
- **No freeform drawing, simulation, save/load, or social features** — all
  of Phases 8–18 in the product vision are entirely unstarted. This review
  intentionally did not touch them (per the "do not implement all future
  features in one pass" instruction).
- **No `AerodynamicSolver` interface** (Phase 19) — `analyzeGliderStability`
  is still a single concrete implementation, not swapped behind an
  interface. Low-risk to add later since it's already a pure function of
  `GliderDesign`.

## 6. Testing (Phase 7)

No test framework existed before this review — verification was a
console-output script (`src/physics/verify.ts`) a human had to read and
judge by eye. Added **Vitest** (`vitest.config.ts`, `npm test` /
`npm run test:watch`):

- `src/geometry/core.test.ts` — 17 tests on the geometry primitives
  themselves (area/centroid correctness, winding-order independence,
  degenerate-input handling, MAC bounds, dispatcher routing).
- `src/physics/invariants.test.ts` — 13 tests, parameterized across every
  preset, asserting the properties the product-vision prompt explicitly
  asks for: *"2D planform area equals canonical geometry area,"* *"physics
  receives the same area used for rendering,"* *"CG remains within
  physically meaningful bounds."* Includes regression tests for the delta
  wing and integral-fin bugs specifically, so they can't silently return.

`src/physics/verify.ts` (the old console script) is left in place — it's
still useful as a human-readable summary when hand-tuning a preset's
ballast — but it is no longer the only check.

**30/30 tests pass.** `npx tsc --noEmit`, `npm run build`, and `npx eslint .`
are all clean (3 pre-existing unrelated lint warnings, 0 errors).

## 7. Files changed in this pass

- `src/geometry/core.ts` — new canonical geometry engine.
- `src/geometry/core.test.ts` — new.
- `src/physics/invariants.test.ts` — new.
- `vitest.config.ts` — new.
- `docs/ARCHITECTURE_REVIEW.md` — new (this file).
- `src/types/glider.ts` — removed duplicate `incidenceDeg` fields; added `getWingPlanformKind`.
- `src/physics/massBalance.ts` — `getFuselageProfilePoints` now takes the full `GliderDesign` (needed the fin config); wing/tail/fin area+centroid now sourced from `core.ts`; integral-fin fold-in.
- `src/physics/stability.ts` — elliptical wing area correction.
- `src/geometry/patterns2d.ts` — wing/tail/fuselage outlines sourced from `core.ts`.
- `src/geometry/extrusion3d.ts` — 3D wing shape sourced from `core.ts`.
- `src/constants/presets.ts` — removed dead `incidenceDeg` fields; retuned `noseBallastGrams` for all three presets (see §4 ripple effect).
- `package.json` — added `vitest`, `test`/`test:watch` scripts.

## 8. Remaining risks

- **Preset re-tuning is manual.** There's no automated "solve ballast for
  10% static margin and write it back" tool — someone has to read
  `Recommended Ballast` from `verify.ts` and hand-edit the preset. Fine at
  3 presets; will not scale if the preset library grows.
- **MAC/NP approximation on curved planforms** (§5) means an elliptical
  wing's *reported* static margin is very slightly less trustworthy than a
  trapezoid wing's, even though mass/CG are exact. Not currently
  surfaced to the user anywhere.
- **No UI/component tests** — the 30 tests are all geometry/physics. A
  regression in `ParametricControls.tsx` (e.g., a slider silently
  unbound, as the tail-incidence bug was) would not be caught
  automatically; it was only found by manual UI testing this session.

## 9. Recommended next phase

Two reasonable candidates, both foundational for everything after them:

1. **Phase 2 + 14 together (versioned `PlaneDesign` wrapper + local
   save/load).** Wrap the existing `GliderDesign` as the `geometry` payload
   inside a thin `PlaneDesign { id, schemaVersion, metadata, geometry,
   provenance? }` envelope, without restructuring `GliderDesign` internals.
   This is the smallest change that unblocks save/load (Phase 14),
   fork/remix lineage (Phase 15), and eventually social sharing (Phase 16)
   — all of which need an `id` + `schemaVersion` + `provenance` to exist
   before they can be designed further.
2. **Phase 6 (geometry validation layer)**, since the canonical geometry
   engine from this pass makes it straightforward to add now — e.g. "wing
   slot position + length must fit within fuselage length" — using the
   same `boundingBox`/`polygonArea` primitives already centralized in
   `core.ts`.

Recommend starting with **(1)**, since save/load is the first place a user
would concretely feel the benefit, and it's a prerequisite for (2)'s
validation results eventually being something worth persisting alongside a
design.

## 10. Design document & local persistence phase

The next foundation layer has now been implemented locally in `src/design/`
and `src/types/design-document.ts` without restructuring `GliderDesign`.

- `PlaneDesignDocument` adds `id`, `schemaVersion`, `version`, metadata, and
  optional fork provenance around the existing engineering payload.
- JSON serialization/deserialization is validated at the document boundary.
- Browser local storage provides a first save/load mechanism without coupling
  the engineering model to a database.
- JSON import/export makes designs portable between browser sessions and
  provides the eventual payload needed for social sharing and forking.
- Fork provenance is modeled now so the later social layer can create immutable
  design lineages rather than overwriting a parent design.

This remains intentionally client-only. Authentication, cloud persistence,
comments, likes, and a social feed should be added only after the local design
contract is stable.

## 11. Geometry & Structural Validation Layer (Phase 6)

Implemented in `src/geometry/validation.ts`, `src/geometry/validation.test.ts`,
and UI badge/inspectors (`ValidationBadge.tsx`, `StabilityInspector.tsx`,
`Header.tsx`):

- **Structural Enclosure Checks**:
  - Wing slot must maintain clean clearance from the nose ($X \ge 8\text{mm}$) and boom.
  - Checks containment of rotated slot corners against the fuselage profile polygon (`isPointInPolygon`).
  - Web thickness audit: samples the upper and lower solid balsa web above/below the slot, warning if bridge thickness $< 2.0\text{mm}$ (fragile joint that snaps during laser cutting) or erroring if the slot breaches the spine/belly.
  - Tail slot clearance: verifies tail slot does not overlap wing, starts within the fuselage, and accommodates both enclosed through-slots and open-ended rear sliding stabilizer slots.
- **Material & Stock Sheet Fit**:
  - Checks wing root chord and fuselage depth against commercial 3" ($76.2\text{mm}$) and 4" ($101.6\text{mm}$) stock balsa sheets, providing informative guidance when multi-sheet joining is required.
  - Checks wingspan against standard 36" ($914.4\text{mm}$) balsa sheet length.
- **Aerodynamic Feasibility**:
  - Audits horizontal tail volume ratio ($V_h \ge 0.28$), roll dihedral angle ($\Gamma \ge 2.0^\circ$), aspect ratio flutter limits ($AR \le 15.0$), and static margin balance ($SM \ge 0\%$).
- **UI Integration**:
  - Compact `ValidationBadge` in header gives real-time visual feedback ("Laser-Ready & Sound", "Warnings", "Structural Errors") with an audit popover explaining issues and suggested fixes.
  - High-priority structural alert banner embedded directly in `StabilityInspector`.

**47/47 tests pass** across all four test suites.

