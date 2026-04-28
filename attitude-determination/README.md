# Attitude Determination & Control — Interactive Study Modules

**Based on Prof. Iess's lecture notes & Sidi, *Spacecraft Dynamics and Control* (1997)**

This folder contains 6 interactive React-based modules split into two tracks:

- **Track A (Parts a1–a3):** Attitude Determination — sensors, algorithms, and estimation
- **Track B (Parts b1–b3):** Attitude Dynamics & Control — equations of motion, stability, and actuators

## Track A — Attitude Determination

### Part a-1: Fundamentals & Algorithms (pp. 1–30)
**File:** `part-a1.html`

Core topics: spacecraft attitude definition, reference frames (ICRF, OBF, SCF, GCF), the attitude matrix A (direction cosine matrix), Euler's theorem, quaternion algebra, Wahba's problem and cost function, TRIAD algorithm (deterministic, 2 vectors), QUEST algorithm (optimal, N vectors), attitude error covariance P_qq.

MATLAB sprints: complete TRIAD and QUEST implementations with numerical examples.

### Part a-2: Sensors & Hardware (pp. 31–104)
**File:** `part-a2.html`

Core topics: star tracker architecture (3 generations: star scanner, fixed-head, autonomous), CCD-to-unit-vector mapping (pixel coordinates to direction), stellar magnitude scale, FOV/accuracy tradeoffs, gyroscope physics (Sagnac effect, ring laser gyro, fiber optic gyro), Farrenkopf noise model (ARW and RRW), Earth horizon sensors (single-beam vs dual-beam), Sun sensors (cosine law, differential configuration), pointing error budgets (APE, RPE, AME).

MATLAB sprints: gyro noise simulation, Allan variance, star sensor FOV analysis.

### Part a-3: MEKF & Sequential Estimation (pp. 105–118)
**File:** `part-a3.html`

Core topics: why additive quaternion EKF fails (unit norm incompatibility), the multiplicative error quaternion trick (delta-q = q x q-hat-inverse), 6-state formulation (delta-theta + delta-bias), linearised dynamics matrices F and G, state transition matrix (block structure), process noise Q from gyro ARW/RRW, measurement update from star tracker QUEST solutions.

MATLAB sprint: full MEKF implementation — prediction, update, and covariance propagation.

## Track B — Attitude Dynamics & Control

### Part b-1: Fundamentals (Slides 1–67)
**File:** `part-b1.html`

Core topics: ACS block diagram (sensors-observer-regulator-actuators-plant), passive vs active control, orbital and body reference frames, Euler's equations of motion (linearised for small angles), gravity gradient torque and stabilisation, pitch dynamics (decoupled 2nd-order), roll-yaw coupling (4th-order), reaction wheel mechanics, PD and PID control design, desaturation using thrusters or magnetic torquers.

MATLAB sprints: pitch step response with PD control, gravity gradient stability analysis.

### Part b-2: Advanced Topics (Slides 68–118)
**File:** `part-b2.html`

Core topics: roll-yaw libration frequencies (characteristic polynomial), symmetric vs triaxial spacecraft, DeBra-Delp stability diagram, passive wheel dampers (viscous friction), magnetic control (torqrod + Earth's B-field), nadir pointing with gravity gradient assist, 4-wheel reaction wheel array (3x4 distribution matrix, cant angle, null-space management).

MATLAB sprints: libration frequency computation, momentum management simulation.

### Part b-3: Appendices & Exam Practice (Slides 119–168)
**File:** `part-b3.html`

Core topics: complex analysis review (Cauchy-Riemann, Laurent series, residues, poles), Routh-Hurwitz stability criterion (array construction, sign-change counting), gravity gradient tensor derivation (from potential theory), comprehensive oral exam practice module covering the entire course.

MATLAB sprint: Routh-Hurwitz stability checker implementation.

## Notation Conventions

All modules follow the professor's notation consistently:

- **Scalar LAST quaternion:** q = [q-vec; q4] where q4 = cos(phi/2)
- **Attitude matrix:** W = A V (reference-to-body rotation)
- **Body frame axes:** x (roll), y (pitch), z (yaw)
- **Orbital frame:** +z nadir, +y opposite angular momentum, +x along velocity
