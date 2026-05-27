# Space Missions & Systems — Interactive Study Modules

**MSc Space & Astronautical Engineering — Sapienza University of Rome**
**Course: Space Missions & Systems (SMS) 2025-2026**
**Professor: Luciano Iess**

---

An open-source collection of **14 interactive web-based study modules** covering the full SMS curriculum: Orbit Determination, Attitude Determination & Control, Observables & Radiometric Systems, and Time, Clocks & Reference Systems. Each module is a self-contained, browser-based application featuring derivations, equations, MATLAB code sprints, oral-exam drills, and real mission examples.

> **Live site:** [https://2248220hub.github.io/Space_missions_and_systems/](https://2248220hub.github.io/Space_missions_and_systems/)

---

## Live Modules

### Module A — Orbit Determination (4 Parts)

Based on **Tapley, Schutz & Born**, *Statistical Orbit Determination* (2004), Chapter 4.

| # | Module | Sections | Topics | Live Link |
|---|--------|----------|--------|-----------|
| 1 | OD Part 1 | §4.1–§4.3.3 | Linearisation of the orbit problem, state deviation equation, observation-state mapping (H-tilde), accumulation of normal equations | [Open](https://2248220hub.github.io/Space_missions_and_systems/orbit-determination/part-1.html) |
| 2 | OD Part 2 | §4.3.4–§4.6 | Minimum variance estimation, weighted least squares, a priori information, sequential processing, information filter | [Open](https://2248220hub.github.io/Space_missions_and_systems/orbit-determination/part-2.html) |
| 3 | OD Part 3 | §4.7–§4.9 | Consider parameters, process noise, state noise compensation (SNC), dynamic model compensation (DMC), Householder transformations, SRIF | [Open](https://2248220hub.github.io/Space_missions_and_systems/orbit-determination/part-3.html) |
| 4 | OD Part 4 | §4.10–§4.17 | Kalman filter, extended Kalman filter, observability, covariance analysis, filter consistency, data editing, Schmidt-Kalman filter | [Open](https://2248220hub.github.io/Space_missions_and_systems/orbit-determination/part-4.html) |

### Module B — Attitude Determination (3 Parts)

Based on **Prof. Iess's lecture notes** and **Sidi**, *Spacecraft Dynamics and Control* (1997).

| # | Module | Pages | Topics | Live Link |
|---|--------|-------|--------|-----------|
| 5 | AD Part a-1 | pp. 1–30 | Reference frames (ICRF, OBF, SCF), attitude matrix, Wahba's problem, TRIAD algorithm, QUEST algorithm, quaternion algebra | [Open](https://2248220hub.github.io/Space_missions_and_systems/attitude-determination/part-a1.html) |
| 6 | AD Part a-2 | pp. 31–104 | Star tracker hardware & CCD mapping, gyroscope physics (Sagnac, RLG, FOG), Farrenkopf noise model (ARW/RRW), Earth & Sun sensors, pointing error budgets | [Open](https://2248220hub.github.io/Space_missions_and_systems/attitude-determination/part-a2.html) |
| 7 | AD Part a-3 | pp. 105–118 | Multiplicative EKF (MEKF), error quaternion formulation, 6-state filter (delta-theta + delta-bias), covariance propagation, process noise tuning | [Open](https://2248220hub.github.io/Space_missions_and_systems/attitude-determination/part-a3.html) |

### Module C — Attitude Dynamics & Control (3 Parts)

Based on **Sidi**, *Spacecraft Dynamics and Control* (1997) and **Prof. Iess's slides**.

| # | Module | Slides | Topics | Live Link |
|---|--------|--------|--------|-----------|
| 8 | AD Part b-1 | 1–67 | ACS architecture, Euler's equations (linearised), gravity gradient stabilisation, pitch/roll/yaw dynamics, reaction wheels, PD/PID control, desaturation | [Open](https://2248220hub.github.io/Space_missions_and_systems/attitude-determination/part-b1.html) |
| 9 | AD Part b-2 | 68–118 | Roll-yaw coupling & libration frequencies, DeBra-Delp stability diagram, wheel dampers, magnetic torquers, nadir pointing control, 4-wheel RWA architecture | [Open](https://2248220hub.github.io/Space_missions_and_systems/attitude-determination/part-b2.html) |
| 10 | AD Part b-3 | 119–168 | Complex analysis for Laplace transforms, Routh-Hurwitz stability criterion, gravity gradient tensor derivation, comprehensive exam practice | [Open](https://2248220hub.github.io/Space_missions_and_systems/attitude-determination/part-b3.html) |

### Module D — Observables for OD & Radiometric Systems (2 Parts)

Based on **TSB Chapter 3** and **Prof. Iess's lecture notes** on deep-space navigation.

| # | Module | Chapter | Topics | Live Link |
|---|--------|---------|--------|-----------|
| 11 | Observables Part 1 | Ch. 3 (First Half) | Antenna theory & gain patterns, link budget equation (EIRP, G/T, C/N₀), noise temperature & system noise, DSN ground station architecture, signal-to-noise analysis | [Open](https://2248220hub.github.io/Space_missions_and_systems/observables-for-OD-and-radiometric-systems/part-1.html) |
| 12 | Observables Part 2 | Ch. 3 (Second Half) | Radiometric signal model, Doppler observable & extraction, range measurement (PN codes, T₄ turnaround), Delta-DOR (VLBI technique), comprehensive exam practice | [Open](https://2248220hub.github.io/Space_missions_and_systems/observables-for-OD-and-radiometric-systems/part-2.html) |

### Module E — Time, Clocks & Reference Systems (2 Parts)

Based on **TSB Chapter 5** — timekeeping and relativistic corrections for navigation.

| # | Module | Chapter | Topics | Live Link |
|---|--------|---------|--------|-----------|
| 13 | Time & Clocks Part 1 | Ch. 5 (First Half) | Time scales (TAI, UTC, TDB, TT), clock models & Allan variance, atomic clock physics (Cs, Rb, H-maser), reference system definitions (ICRF, ITRF), Earth orientation parameters (polar motion, UT1-UTC, precession, nutation) | [Open](https://2248220hub.github.io/Space_missions_and_systems/CH5-Time-Clocks-and-Reference-Systems/part-1.html) |
| 14 | Time & Clocks Part 2 | Ch. 5 (Second Half) | Special & general relativistic time corrections, Schwarzschild metric, GPS relativistic effects (38 μs/day), gravitational redshift, Shapiro delay, one-way & two-way time transfer, clock ensembles | [Open](https://2248220hub.github.io/Space_missions_and_systems/CH5-Time-Clocks-and-Reference-Systems/part-2.html) |

---

## Key Features

Each interactive module includes:

- **Structured theory** with step-by-step derivations in the professor's notation
- **MATLAB code sprints** — ready-to-run implementations of TRIAD, QUEST, MEKF, Kalman filters, link budgets, and control algorithms
- **Oral exam drill questions** with expandable answers — practice for the SMS oral examination
- **Real mission examples** — Cassini, BepiColombo, GOCE, Juno, and more
- **Common traps & pitfalls** — the mistakes students actually make in exams
- **Notation glossary** — every symbol defined with dimensions, meaning, and warnings

## How to Use

1. Visit the [landing page](https://2248220hub.github.io/Space_missions_and_systems/) or click any module link above
2. Navigate using the sidebar (desktop) or scroll through sections
3. Use the **tabs** within each module: Overview, Equations, Derivations, MATLAB, Traps, Drill
4. Practice with the oral exam Q&A — click to reveal answers

## Technology

All modules are self-contained HTML files — no server, no installation, no dependencies. The Orbit Determination, Observables, and Time modules use vanilla HTML/CSS/JS. The Attitude modules use React 18 (loaded from CDN) for interactive state management.

## References

- Tapley, B.D., Schutz, B.E., Born, G.H. (2004). *Statistical Orbit Determination*. Academic Press.
- Sidi, M.J. (1997). *Spacecraft Dynamics and Control*. Cambridge University Press.
- Prof. Luciano Iess, SMS lecture notes, Sapienza University of Rome, 2025-2026.

---

**Author:** Leo — MSc Space & Astronautical Engineering, Sapienza University of Rome
**Hosted on:** [GitHub Pages](https://2248220hub.github.io/Space_missions_and_systems/)
