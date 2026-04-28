# Orbit Determination — Interactive Study Modules

**TSB Chapter 4: Linear Orbit Determination** — Tapley, Schutz & Born (2004)

This folder contains 4 interactive HTML modules covering the complete theory of statistical orbit determination as taught in the SMS course at Sapienza.

## Modules

### Part 1 — Foundations (§4.1–§4.3.3)
**File:** `part-1.html`

Core topics: linearisation of the nonlinear orbit problem around a reference trajectory, the state deviation equation `x(t) = Phi(t,t0) x(t0)`, observation-state mapping matrix H-tilde, accumulation of normal equations, and the batch least-squares estimator.

MATLAB sprint: building the H-tilde matrix and normal equations from range/range-rate observations.

### Part 2 — Estimation Theory (§4.3.4–§4.6)
**File:** `part-2.html`

Core topics: minimum variance estimation, weighted least squares with data weights W, incorporating a priori information (x-bar, P-bar), sequential processing algorithm (one observation at a time), and the information filter (inverse covariance formulation).

MATLAB sprint: sequential WLS with a priori, comparing batch vs sequential solutions.

### Part 3 — Advanced Estimation (§4.7–§4.9)
**File:** `part-3.html`

Core topics: consider parameters (parameters that affect observations but are not estimated), process noise and state noise compensation (SNC), dynamic model compensation (DMC), numerical stability via Householder transformations, and the Square Root Information Filter (SRIF).

MATLAB sprint: SRIF implementation, Householder QR factorisation.

### Part 4 — Kalman Filter & Beyond (§4.10–§4.17)
**File:** `part-4.html`

Core topics: the Kalman filter (prediction + update cycle), extended Kalman filter (EKF) for nonlinear systems, observability conditions, covariance analysis, filter consistency checks, data editing/outlier rejection, and the Schmidt-Kalman (consider) filter.

MATLAB sprint: full EKF for orbit determination with process noise tuning.

## Key Equations

Every module contains the essential equations with step-by-step derivations:

- Normal equations: `(H^T W H) x-hat = H^T W y`
- Sequential update: `x-hat_new = x-hat_old + K (y - H x-hat_old)`
- Kalman gain: `K = P H^T (H P H^T + R)^{-1}`
- State transition: `x(t) = Phi(t,t0) x(t0)`
- Covariance propagation: `P(t) = Phi P(t0) Phi^T + Q`
