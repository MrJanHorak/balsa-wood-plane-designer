# First physical build: what the evidence tells us

Source: the [feedback record](BUILD_TEST_FEEDBACK.md), the
[exported design](implementation_status_files/sky-scout-trainer.balsa%20(5).json),
the [Letter print packet](implementation_status_files/sky-scout-trainer-letter-100-percent%20(1).pdf),
and [assembly photos](implementation_status_files/20260923_140629.jpg).

| Item | Nominal design or app estimate | Reported or observed |
| --- | --- | --- |
| Print | Letter at 100%; 50 × 10 mm reference | Reference measured 50 × 10 mm; parts aligned at tile joins. |
| Main wing | 285 mm span, 9° dihedral per half, 8% mean camber | Builder pulled the wing straight through: approximately 0° dihedral. Actual camber is unknown. |
| Weight and balance | 7.10 g total including 1.71 g design nose ballast; CG 107.7 mm from nose, neutral point 112.1 mm | Actual mass, ballast mass and CG unknown. Different temporary weights produced noticeably different results. |
| Flight | App formerly displayed a 13.9:1 glide-ratio heuristic | Approx. 4.29 m travel from 1.77 m release height; slight right pull and a possible mid-flight stall. |

The observed **distance divided by release height is about 2.42**. That is a
useful repeatable flight-test figure, but it is not the glider's steady-flight
lift-to-drag ratio: the hand launch adds speed, and the reported path was not a
steady descent. NASA's [glider trajectory discussion](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/glider-trajectory-problem/)
derives the height/distance relation for steady flight. The app's old 13.9:1
readout came from a simple aspect-ratio/camber heuristic, not from measured
drag or a trim solution. We should not tune that formula to one throw.

The design's 9° dihedral corresponds to roughly **22 mm tip rise** over each
142.5 mm half-span. The builder confirmed that the wing was instead pulled
straight through, leaving approximately **0° as-built dihedral**. This is a
meaningful departure from the 3D preview and stability assumptions: [dihedral
contributes to roll stability](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/wing-geometry/).
Its absence reduces the intended self-leveling tendency but does not by itself
choose a right-turn direction. Built-in asymmetry, fin alignment, launch
technique, or air movement still need checking.

The design's 8% root camber corresponds to roughly **4.8 mm maximum mean-line
rise** over the 60 mm root chord, near 40% chord. Actual camber remains unknown;
the printed blank and through-slot do not form it automatically. Balsa
springback, bending, wing twist, and slot fit can make the built shape differ
from the design. A climb and drop can involve ballast/CG, incidence, speed, or
trim. The present CG-to-neutral-point check is a static model and does not
establish that the plane is trimmed or will avoid a stall.

## Most useful next test

1. Measure finished mass, actual nose clay mass, and balance point from the nose.
   Check whether the wing and tail sit squarely and whether the wing has any
   camber or twist. A side-on photo against a ruler can help measure camber
   and wing/tail incidence. Record the known flat as-built wing in the app.
2. With one unchanged trim setting and similar gentle throws in calm air, record
   five distances from the same release height. Note whether it first climbs,
   stays level, or dives, and whether it turns the same way each time.
3. Change **one** thing at a time. Start with a small, measured ballast
   increment if the balance differs from the app's 107.7 mm estimate. If the
   wing can be formed safely, compare a later build with approximately 22 mm
   rise at each tip and measure the final shape. Record a second set of throws
   for each change. Keep the original design JSON and named versions so the
   builds can be compared.

The app now has a Build & flight tests panel for these observations. It stores
measurements in the design JSON and labels distance/release-height as a test
result rather than a predicted glide ratio. A better simulator should follow
once measured mass, CG, built wing shape, and repeatable flight behavior are
available.
