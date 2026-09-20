# Implementation Plan: Interactive Custom Wing Planform Designer

Add an interactive 2D node-based planform editor for wings (and horizontal tail), allowing users to custom-design swept, tapered, elliptical, gull, delta-strake, or freeform wing outlines with real-time symmetry mirroring, 3D camber extrusion, 2D laser-cut templates, and stability physics.

---

## User Review Required

> [!IMPORTANT]
> **Half-Span Symmetry Editing**
> Unlike the fuselage (which has a single asymmetrical side silhouette), wings are aerodynamically symmetric across the fuselage centerline ($Y = 0$).
> The **Custom Wing Planform Designer** will:
> 1. Allow the user to drag control points on the **right wing panel** (root chord, leading edge, wingtip, and trailing edge).
> 2. Automatically mirror the left wing panel across $Y = 0$ in real time with a center joint guide line.
> 3. Allow adding nodes along the leading edge (e.g. cranked sweep, forward sweep, elliptical arches) or trailing edge (reflex, forward tapers).

> [!NOTE]
> **Slider Responsiveness for Custom Wings**
> Just like the custom fuselage designer, when a wing is in `'custom'` mode, tweaking the "Wingspan" or "Center Chord" sliders will scale the custom nodes proportionally using `scalePointsAboutOrigin`, preserving the user's custom shape while letting them resize the aircraft.

---

## Proposed Changes

### 1. Data Model & Types

#### [MODIFY] [types/glider.ts](file:///d:/development/BalsaPlainSite/src/types/glider.ts)
- Extend `WingPlanformType` to include `'custom'`:
  ```typescript
  export type WingPlanformType = 'tapered' | 'rectangular' | 'elliptical' | 'delta' | 'custom';
  ```
- Add `WingNode`:
  ```typescript
  export interface WingNode {
    id: string;
    label: string;
    xMm: number; // Chordwise position (0 = root LE)
    yMm: number; // Spanwise position (0 = centerline, +halfSpan = tip)
    isFixedRoot?: boolean; // Root LE (0,0) and root TE (cr,0) locked to centerline
  }
  ```
- Add `customNodes?: WingNode[]` to `WingConfig`.

---

### 2. Canonical Geometry Engine

#### [MODIFY] [geometry/core.ts](file:///d:/development/BalsaPlainSite/src/geometry/core.ts)
- Add `calculateCustomWingPlanformPoints(nodes: Point2D[], spanMm: number, rootChordMm: number): Point2D[]`:
  - Generates the full symmetric planform (root LE $\to$ right LE $\to$ right tip $\to$ right TE $\to$ root TE $\to$ left TE $\to$ left tip $\to$ left LE $\to$ close).
- Update `getWingStationAt`:
  - When planform is `'custom'`, interpolates $X_{LE}(t)$ and $\text{chord}(t)$ at any span fraction $t \in [0, 1]$ directly from the custom leading and trailing edge segments.
- Update `calculateWingPlanformPoints`:
  - Routes `'custom'` planform to `calculateCustomWingPlanformPoints`.

---

### 3. Interactive UI Component

#### [NEW] [WingProfileEditor.tsx](file:///d:/development/BalsaPlainSite/src/components/ui/WingProfileEditor.tsx)
- Full interactive SVG canvas modal (matching the visual styling and toolbar of `FuselageProfileEditor`):
  - **Right Panel Active Editing**: Draggable cyan nodes for root LE, LE contour, tip, TE contour, root TE.
  - **Left Panel Mirrored Preview**: Rendered with subtle translucency and dashed symmetry contour.
  - **Centerline & Fuselage Reference**: Shows fuselage width and slot tab location overlay.
  - **Midpoint Insert Buttons**: Click '+' dots on any edge to insert new control points.
  - **Toolbar**: Undo (Ctrl+Z), Redo (Ctrl+Y), Delete Point, Reset to Standard Shape (Tapered / Rectangular / Elliptical / Delta).
  - **Live Dimensions**: Real-time readouts of Span, Root Chord, Tip Chord, Area, and Aspect Ratio.

#### [MODIFY] [ParametricControls.tsx](file:///d:/development/BalsaPlainSite/src/components/ui/ParametricControls.tsx)
- Add "Edit Custom Wing Shape" button to the "Wing" tab header.
- Add proportional node scaling when `spanMm` or `rootChordMm` sliders are adjusted in custom mode.

---

### 4. Downstream Systems Synchronization

#### [MODIFY] [geometry/extrusion3d.ts](file:///d:/development/BalsaPlainSite/src/geometry/extrusion3d.ts)
- `createHalfWingGeometry` already calls `getWingStationAt`: with custom station interpolation, 3D WebGL meshes will automatically curve and extrude custom wings with full camber and dihedral.

#### [MODIFY] [geometry/patterns2d.ts](file:///d:/development/BalsaPlainSite/src/geometry/patterns2d.ts)
- `generateWingFlatPattern` calls `calculateWingPlanformPoints`: custom wings will automatically export to 2D laser-cut patterns with center dihedral score line and slot tab.

#### [MODIFY] [physics/massBalance.ts](file:///d:/development/BalsaPlainSite/src/physics/massBalance.ts) & [physics/stability.ts](file:///d:/development/BalsaPlainSite/src/physics/stability.ts)
- Mass, CG, neutral point, and aerodynamic stability will automatically compute from the exact canonical custom wing polygon.

---

## Verification Plan

### Automated Tests
- Run `npm test` to ensure all 81 existing tests continue to pass.
- Add new unit tests in `core.test.ts`:
  - Symmetry verification (left half is exact reflection of right half).
  - Area and centroid consistency.
  - Station interpolation at arbitrary span fractions ($t \in [0, 1]$).
  - Slider scaling with `scalePointsAboutOrigin`.

### Manual Verification
1. **Launch Wing Editor**: In the "Wing" tab, click "Edit Custom Wing Shape". Confirm modal opens with the current wing preset.
2. **Symmetry Dragging**: Drag a leading-edge point forward or wingtip aft — confirm the left wing mirrors symmetrically.
3. **Add & Remove Points**: Click an edge '+' dot to add a mid-span sweep crank; select and delete with Trash button.
4. **Live Synchronization**:
   - Close modal: confirm 3D preview immediately shows the custom wing with dihedral and camber arch.
   - Switch to "2D Patterns" tab: confirm 1:1 laser-cut template matches the custom wing shape.
   - Check Flight Balance card: verify weight, wing loading, and static margin update dynamically.
