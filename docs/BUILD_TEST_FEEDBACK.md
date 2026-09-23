# First print and flight: feedback record

Save a **named version** before printing (for example, `First physical build`) and
export that version's design JSON. Keep the PDF with the same build. A version name
and JSON file let us reproduce the exact geometry when you report a problem.

You can paste the completed record into our conversation and attach photos of the
printed parts, assembled aircraft, or a short flight video if useful. Approximate
measurements are fine; mark anything you did not measure as `unknown`. Report what
actually happened, even if it differs from the app's estimate.

## Build record

- Design name, named version, and design JSON file:
- PDF paper size (A4/Letter), print setting (`Actual size` / `100%`), and measured
  width and height of the **50 x 10 mm calibration box**: Letter, 50 x 10 mm calibration box
- Balsa thickness measured with a ruler or calipers, and grain direction for each
  part (nose-to-tail, spanwise, or other):
- Were any parts clipped by a page edge, misaligned at a tile join, or difficult to
  identify? Include page/row/column labels if so: no
- Wing and tail slot fit: too tight / snug / loose. Note which direction you inserted
  each part, whether you sanded or widened a slot, and about how much:
- Any cracked or fragile bridges, awkward insertion path, or trouble attaching the
  fin? Mark the location on a photo if possible:
- Assembled mass (g), nose ballast added (g), and measured balance point from the
  nose (mm). Include the app's estimated mass/CG if available:

## Flight record

Use a consistent, gentle launch in a clear, safe area. Make several flights without
changing the design between throws; separate each change into a new record.

- Launch height (m), approximate launch speed or effort, and wind conditions:
- Distances flown over 3–5 attempts (m), including any immediate stalls or dives: distance aprox 429cm always from about177cm height. Slight tendency to pull to the right and it seems to stall not glide at about half way.
- Observed pitch behavior: steady / nose-down / nose-up then stall / repeated
  oscillation / other. Note whether it rolled or turned consistently:
- Adjustments between trials (ballast, wing/tail incidence, bend, trim), with
  before-and-after result: I tried with different weights, paper clips, one large one small, that was too light, two pennies to the front were too heavy. A rubber pencil top eraser on the tip was ok. In the end I put playdoh on it to balance out the weight.
- What did the app predict, and what differed most from the real plane?

Measured flight distance divided by launch height is a rough glide-ratio observation
only when the launch and path are comparable; a hand throw adds speed and can make
that simple ratio misleading. NASA's [glider trajectory explanation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/glider-trajectory-problem/)
shows the steady-glide force balance and how measured height, distance, and weight
can inform a model. Our current balance and glide readouts are estimates, so these
build results should guide calibration before adding a flight simulator.

## How findings become changes

For each discrepancy, keep the reproducible design version and the measured result
together. We can then classify it as (1) print scale/tiling, (2) cut geometry and
fit, (3) material mass/CG, or (4) aerodynamic behavior. Fix print and fit issues
first, repeat the build check, then use repeated flight data to adjust the physics.
This prevents a simulator from being tuned to a model that cannot yet be assembled
as drawn.
