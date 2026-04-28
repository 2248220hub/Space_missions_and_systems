# Space Missions & Systems — Interactive Study Modules

**MSc Space & Astronautical Engineering — Sapienza University of Rome**
**Course: Space Missions & Systems (SMS) 2025-2026**
**Professor: Luciano Iess**

---

An open-source collection of **10 interactive web-based study modules** covering the full SMS curriculum: Orbit Determination and Attitude Determination & Control. Each module is a self-contained, browser-based application featuring derivations, equations, MATLAB code sprints, oral-exam drills, and real mission examples.

## Live Modules

### Module A — Orbit Determination (4 Parts)

Based on **Tapley, Schutz & Born**, *Statistical Orbit Determination* (2004), Chapter 4.

| # | Module | Sections | Topics |
|---|--------|----------|--------|
| 1 | [OD Part 1](orbit-determination/part-1.html) | §4.1–§4.3.3 | Linearisation of the orbit problem, state deviation equation, observation-state mapping (H-tilde), accumulation of normal equations |
| 2 | [OD Part 2](orbit-determination/part-2.html) | §4.3.4–§4.6 | Minimum variance estimation, weighted least squares, a priori information, sequential processing, information filter |
| 3 | [OD Part 3](orbit-determination/part-3.html) | §4.7–§4.9 | Consider parameters, process noise, state noise compensation (SNC), dynamic model compensation (DMC), Householder transformations, SRIF |
| 4 | [OD Part 4](orbit-determination/part-4.html) | §4.10–§4.17 | Kalman filter, extended Kalman filter, observability, covariance analysis, filter consistency, data editing, Schmidt-Kalman filter |

### Module B — Attitude Determination (3 Parts)

Based on **Prof. Iess's lecture notes** and **Sidi**, *Spacecraft Dynamics and Control* (1997).

| # | Module | Pages | Topics |
|---|--------|-------|--------|
| 5 | [AD Part a-1](attitude-determination/part-a1.html) | pp. 1–30 | Reference frames (ICRF, OBF, SCF), attitude matrix, Wahba's problem, TRIAD algorithm, QUEST algorithm, quaternion algebra |
| 6 | [AD Part a-2](attitude-determination/part-a2.html) | pp. 31–104 | Star tracker hardware & CCD mapping, gyroscope physics (Sagnac, RLG, FOG), Farrenkopf noise model (ARW/RRW), Earth & Sun sensors, pointing error budgets |
| 7 | [AD Part a-3](attitude-determination/part-a3.html) | pp. 105–118 | Multiplicative EKF (MEKF), error quaternion formulation, 6-state filter (delta-theta + delta-bias), covariance propagation, process noise tuning |

### Module C — Attitude Dynamics & Control (3 Parts)

Based on **Sidi**, *Spacecraft Dynamics and Control* (1997) and **Prof. Iess's slides**.

| # | Module | Slides | Topics |
|---|--------|--------|--------|
| 8 | [AD Part b-1](attitude-determination/part-b1.html) | 1–67 | ACS architecture, Euler's equations (linearised), gravity gradient stabilisation, pitch/roll/yaw dynamics, reaction wheels, PD/PID control, desaturation |
| 9 | [AD Part b-2](attitude-determination/part-b2.html) | 68–118 | Roll-yaw coupling & libration frequencies, DeBra-Delp stability diagram, wheel dampers, magnetic torquers, nadir pointing control, 4-wheel RWA architecture |
| 10 | [AD Part b-3](attitude-determination/part-b3.html) | 119–168 | Complex analysis for Laplace transforms, Routh-Hurwitz stability criterion, gravity gradient tensor derivation, comprehensive exam practice |

---

## Key Features

Each interactive module includes:

- **Structured theory** with step-by-step derivations in the professor's notation
- **MATLAB code sprints** — ready-to-run implementations of TRIAD, QUEST, MEKF, Kalman filters, and control algorithms
- **Oral exam drill questions** with expandable answers — practice for the SMS oral examination
- **Real mission examples** — Cassini, BepiColombo, GOCE, Juno, and more
- **Common traps & pitfalls** — the mistakes students actually make in exams
- **Notation glossary** — every symbol defined with dimensions, meaning, and warnings

## How to Use

1. Click any module link above (or visit the [landing page](index.html))
2. Navigate using the sidebar (desktop) or scroll through sections
3. Use the **tabs** within each module: Overview, Equations, Derivations, MATLAB, Traps, Drill
4. Practice with the oral exam Q&A — click to reveal answers

## Technology

All modules are self-contained HTML files — no server, no installation, no dependencies. The Orbit Determination modules use vanilla HTML/CSS/JS. The Attitude modules use React 18 (loaded from CDN) for interactive state management.

## References

- Tapley, B.D., Schutz, B.E., Born, G.H. (2004). *Statistical Orbit Determination*. Academic Press.
- Sidi, M.J. (1997). *Spacecraft Dynamics and Control*. Cambridge University Press.
- Prof. Luciano Iess, SMS lecture notes, Sapienza University of Rome, 2025-2026.

---

**Author:** Leo — MSc Space & Astronautical Engineering, Sapienza University of Rome
**Hosted on:** GitHub Pages
