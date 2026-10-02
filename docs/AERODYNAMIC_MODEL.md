# Design-based flight exploration

The 2D Flight tab works with every preset and custom design. It starts with the
existing cut-part mass calculation: sheet area × thickness × selected balsa
density, plus nose ballast. A recorded or manually entered assembled mass can
replace that estimate for one exploration. The design's projected wing outline
supplies area, aspect ratio, and mean aerodynamic chord; the wing slot supplies
the initial incidence assumption. No first-build measurements are hard-coded.

## Quantities calculated from the design

At selected airspeed `V`, wing area `S`, mass `m`, mean aerodynamic chord `c`,
air density `rho = 1.225 kg/m³`, and kinematic viscosity `nu = 1.5e-5 m²/s`:

- Wing loading: `m / S` (displayed in g/dm²).
- Reynolds number: `V × c / nu`.
- Lift coefficient needed to support the weight: `2mg / (rho × V² × S)`.
- Speed needed for a *specified* lift coefficient: `sqrt(2mg / (rho × S × CL))`.

These equations are direct consequences of the [NASA lift equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/lift-equation-2/).
The support-speed readout uses an **assumed** maximum lift coefficient and must
not be read as a measured stall speed. The required-lift calculation treats the
wing as carrying all the weight; a real tail may carry positive or negative lift.

## Coefficients used by the trajectory

The linear lift slope is `2π / (1 + 2/AR)` per radian. The zero-lift angle is
numerically integrated from the same 40%-chord camber line used to draw the
wing, following [MIT's thin-airfoil relation](https://ocw.mit.edu/courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/d721171c42af48a056aaccec784a6d10_f03_0304.pdf).
Lift is capped at the editable scenario maximum. Drag uses
`CD = CD0 + CL² / (π × AR × e)`, where `CD0` is profile/other drag and `e` is
span efficiency. The defaults (`CD0 = 0.09`, `CL limit = 0.9`, `e = 0.7`) are
explicit exploration inputs, **not** values inferred from balsa density or a
measured airfoil. The trajectory uses these same coefficients, so adjusting an
assumption changes both the readout and the animated path.

The point-mass trajectory holds wing angle of attack fixed. Its default comes
from the design wing incidence under the simplifying assumption that the body
follows the flight path. It does not calculate pitch trim, stall or separated
flow, tail loads, wind, or left/right turning. Material density determines
estimated mass, not the aerodynamic section properties. Actual sheet density,
wing camber, twist, and surface finish may differ from the design values.

## Path to higher fidelity

[MIT XFOIL](https://web.mit.edu/drela/Public/web/xfoil/) can generate 2D
airfoil polars if the as-built wing section is known. Its user guide notes
[convergence problems at very low Reynolds numbers](https://web.mit.edu/drela/Public/web/xfoil/xfoil_doc.txt),
which is relevant for a small hand-launched glider. [MIT AVL](https://web.mit.edu/drela/Public/web/avl/)
can estimate 3D wing/tail loading, moments, and trim from an exported
configuration. Neither program currently runs inside this site. Their outputs
would need checked geometry, convergence checks, and comparison with repeated
flights before replacing the editable scenario coefficients.
