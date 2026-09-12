# Implementation Plan: 3D Camber Visualization & Custom Part Design

## Overview
This plan addresses:
1. **Fixing the 3D Camber Visualization** in the Three.js viewport: making the "Wing Arch Curve (Camber)" slider visibly bow the wing panels along the chord line into a realistic curved balsa sheet airfoil.
2. **Next Platform Step (Phase 8): Interactive Freeform Customizer**: enabling users to design their own fuselage profiles and wing/tail shapes via interactive control nodes or custom profiles.

---

## User Review Required

> [!IMPORTANT]
> **Part 1: 3D Camber Curvature**
> Currently, `createWingMesh` in `src/geometry/extrusion3d.ts` extrudes a flat 2D polygon with only boundary vertices. Because there are no interior chordwise vertices, WebGL renders the wing completely flat regardless of the camber slider.
> We will replace this with a subdivided `THREE.BufferGeometry` (24 chordwise × 24 spanwise segments) computing:
> $$y_{\text{camber}}(s) = \begin{cases} \frac{h_{\max}}{p^2}(2ps - s^2) & s \le p \\ \frac{h_{\max}}{(1-p)^2}((1-2p) + 2ps - s^2) & s > p \end{cases}$$
> where $p = 0.4$ (40% chord peak) and $h_{\max} = \text{chord} \cdot (\text{camberPercent} / 100)$.
> Upper surface: $y_{\text{camber}} + T/2$, lower surface: $y_{\text{camber}} - T/2$, with solid leading edge, trailing edge, root, and tip skirts.

> [!NOTE]
> **Part 2: Next Step — Custom Body, Wings, and Tail Design**
> In previous messages, you asked:
> *"What if a user wants to design their own body, wings and tail design? Is there a way to custom design these parts and use them in the tools already provided?"*
> 
> The next major roadmap milestone is **Phase 8: Interactive Node / Profile Customizer**:
> - An interactive 2D canvas editor where users can drag, add, and adjust fuselage control points (nose shape, cabin/spine profile, wing mount pylon/saddle, underbelly contour, and tail boom).
> - Custom wing planform shape options (taper, elliptical, swept, delta, and custom polyhedral).
> - Instant automatic synchronization: moving any point updates the 3D WebGL model, center of gravity ($CG$), neutral point ($NP$), stability report, and 2D laser cut templates in real time.

---

## Proposed Changes

### 1. 3D Camber Wing Visualization

#### [MODIFY] [extrusion3d.ts](file:///d:/development/BalsaPlainSite/src/geometry/extrusion3d.ts)
- Replace flat `THREE.ExtrudeGeometry` in `createHalfWingGeometry()` with a subdivided parametric mesh generator:
  - Discretizes the half-wing into an $(N+1) \times (M+1)$ grid (24 chord steps, 24 span steps).
  - Respects planform type (`trapezoidal`, `rectangular`, `elliptical`, `delta`) so chord and sweep at every span station match `calculateWingPlanformPoints` from `src/geometry/core.ts`.
  - Calculates upper and lower surface elevation based on `camberPercent`.
  - Builds solid LE, TE, root, and tip quad skirts connecting upper and lower surfaces.
  - Computes outward vertex normals and spanwise wood-grain UV coordinates.
  - Updates the center tab mesh so it mirrors the root camber curve across the fuselage slot.
- Update `balsaMaterial` in `Glider3DViewport.tsx` to ensure `side: THREE.DoubleSide` and proper shadow casting.

---

### 2. Next Step: Interactive Freeform Fuselage Designer (Phase 8)

#### [MODIFY] [types/glider.ts](file:///d:/development/BalsaPlainSite/src/types/glider.ts)
- Extend `FuselageConfig` to support an optional `customProfilePoints?: Point2D[]` array.
- When `customProfilePoints` is present, `getFuselageProfilePoints()` uses the user's custom control points instead of the default parametric template.

#### [MODIFY] [physics/massBalance.ts](file:///d:/development/BalsaPlainSite/src/physics/massBalance.ts)
- Support `customProfilePoints` in `getFuselageProfilePoints`, ensuring integral fin and wing mount saddle adjustments cleanly dock to custom contours.

#### [NEW] [FuselageProfileEditor.tsx](file:///d:/development/BalsaPlainSite/src/components/ui/FuselageProfileEditor.tsx)
- Interactive 2D SVG canvas modal / tab:
  - Displays fuselage profile with draggable control points (Nose, Cabin/Spine, Wing Saddle, Tail Boom, Underbelly).
  - Ability to click an edge to insert a new node, or delete existing nodes.
  - Live preview overlay of wing slot, tail slot, and CG indicator.
  - Reset to Standard Presets ("Classic Stick", "Aero Streamline", "Pylon Pod").

---

## Verification Plan

### Automated Tests
- Run `npm test` to verify all 47 existing geometry, document, validation, and invariant tests pass.
- Add new tests in `core.test.ts` or `extrusion3d` verifying camber height math, bounding boxes, and custom profile fallback handling.
- Run `npm run build` to confirm 0 TypeScript errors.

### Manual Verification
1. **3D Camber Test**: Open the app, view the glider in 3D. Move the "Wing Arch Curve (Camber)" slider from 0% to 8%.
   - At 0%: Wing is a flat plate with standard thickness.
   - At 4.5%: Wing shows a smooth arch curving upward along the chord line.
   - Orbit the camera: confirm top surface, bottom undercamber, leading edge, and trailing edge are all lit and rendered with balsa texture.
2. **Wing Planform Variety**: Test Camber on Rectangular, Tapered, Elliptical, and Delta wings — verify all curve cleanly.
3. **Dihedral & Slot Fit**: Verify left and right wing panels join cleanly at the center tab and tilt with dihedral.
4. **Custom Profile Editor**: Verify modifying fuselage nodes in the profile editor reshapes the 3D fuselage, re-computes mass and CG, and updates 2D laser cut templates.
