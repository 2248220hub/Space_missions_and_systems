import { useState, useMemo } from "react";

// ─── NOTATION DATA ──────────────────────────────────────────────────────────
const NOTATION_GROUPS = [
  {
    title: "Attitude Matrix & Vectors", emoji: "🧭", color: "#3b82f6",
    rows: [
      { sym: "A", dim: "3×3", desc: "Attitude matrix (direction cosine matrix)", detail: "Orthogonal rotation matrix mapping vectors from ICRF to body/OBF frame. det(A)=1. THIS is the unknown we solve for in attitude determination.", trap: "A must be a PROPER orthogonal matrix: AᵀA = I AND det(A)=+1. Don't forget the determinant constraint!" },
      { sym: "Wᵢ", dim: "3×1", desc: "Observed unit vector in body/OBF frame", detail: "Unit vector of a celestial object (star, Sun, Earth) as measured by a sensor (star tracker, sun sensor) in the spacecraft body or optical bench frame.", trap: "These come from the SENSOR — they are the measurement." },
      { sym: "Vᵢ", dim: "3×1", desc: "Known unit vector in ICRF", detail: "Unit vector of the same celestial object as known from a catalog (e.g., star catalog with RA & DEC). These are reference vectors.", trap: "Must be corrected for proper motion, parallax, and aberration before use!" },
      { sym: "aᵢ", dim: "scalar", desc: "Measurement weight for i-th observation", detail: "Weight assigned to the i-th vector pair in the Wahba cost function. Reflects sensor accuracy.", trap: "Weights must satisfy Σaᵢ = 1 for the simplified cost function to hold." },
      { sym: "B", dim: "3×3", desc: "Attitude profile matrix", detail: "B = Σᵢ aᵢ WᵢVᵢᵀ. This is the KEY matrix in Wahba's problem. All solutions (QUEST, SVD, q-method) are built from B.", trap: "B is NOT symmetric and NOT orthogonal in general." },
    ]
  },
  {
    title: "QUEST / Quaternion Quantities", emoji: "🔄", color: "#8b5cf6",
    rows: [
      { sym: "q = [q⃗, q₄]ᵀ", dim: "4×1", desc: "Attitude quaternion", detail: "q⃗ = [q₁, q₂, q₃]ᵀ is the vector part, q₄ is the scalar part. Unit norm: |q|=1. Represents rotation by angle φ about axis ê: q⃗ = ê sin(φ/2), q₄ = cos(φ/2).", trap: "Convention varies! Iess/Sidi: scalar LAST q=[q⃗;q₄]. Some textbooks put scalar FIRST." },
      { sym: "K", dim: "4×4", desc: "QUEST K-matrix (Davenport's matrix)", detail: "K = [S−σI₃, Z; Zᵀ, σ] where S = B+Bᵀ, σ = tr(B), Z = Σ aᵢ(Wᵢ×Vᵢ). The attitude quaternion is the eigenvector of K for the largest eigenvalue.", trap: "K is SYMMETRIC — its eigenvalues are real. The largest eigenvalue λ_max ≈ 1." },
      { sym: "S", dim: "3×3", desc: "Symmetric part of B+Bᵀ", detail: "S = B + Bᵀ. Used in constructing the K matrix.", trap: "" },
      { sym: "σ", dim: "scalar", desc: "Trace of B: σ = tr(B)", detail: "The trace of the attitude profile matrix. Appears in the diagonal of K as S−σI₃.", trap: "σ is NOT the standard deviation here — it's just tr(B)." },
      { sym: "Z", dim: "3×1", desc: "Vector from cross-products", detail: "Z = Σᵢ aᵢ (Wᵢ × Vᵢ). The antisymmetric information from the observations. Appears as the off-diagonal block of K.", trap: "" },
      { sym: "λ_max", dim: "scalar", desc: "Largest eigenvalue of K", detail: "Very close to 1. Found by Newton-Raphson on the characteristic equation starting from λ₀=1. The corresponding eigenvector gives the optimal quaternion.", trap: "λ_max ≈ 1, NOT exactly 1. Use iterative solver." },
      { sym: "[×]", dim: "3×3", desc: "Skew-symmetric (cross product) matrix", detail: "For vector q⃗=[q₁,q₂,q₃]: [q⃗×] = [[0,-q₃,q₂],[q₃,0,-q₁],[-q₂,q₁,0]]. So q⃗×r = [q⃗×]r.", trap: "Sign convention! [q⃗×] is ANTISYMMETRIC: [q⃗×]ᵀ = -[q⃗×]." },
    ]
  },
  {
    title: "Reference Frames", emoji: "📐", color: "#059669",
    rows: [
      { sym: "OBF", dim: "—", desc: "Optical Bench Frame", detail: "Fixed to the optical bench. Origin at instrument reference point. x-axis along boresight, z-axis often perpendicular to orbit plane (upward).", trap: "Convention varies per mission! Each mission defines its own OBF orientation." },
      { sym: "SCF", dim: "—", desc: "Sensor Coordinate Frame", detail: "Fixed to each sensor (ST, ES, SS). For star trackers: z-SCF along boresight direction (BD). Orientation w.r.t. OBF drifts slowly due to thermal deformation.", trap: "SCF and OBF are NOT identical — there is a calibration rotation between them." },
      { sym: "GCF", dim: "—", desc: "Gyro Coordinate Frame", detail: "Defined by the axes of three orthogonal gyros in the Inertial Reference Unit (IRU). Orientation relative to OBF.", trap: "" },
      { sym: "SRF", dim: "—", desc: "Spacecraft Reference Frame", detail: "Body-fixed frame. This is the frame we want to DETERMINE and CONTROL.", trap: "" },
      { sym: "RF (Orbital)", dim: "—", desc: "Orbital frame (t,s,w)", detail: "z-axis radial (away from or toward central body), y-axis along angular momentum, x-axis completes right-handed frame. Reference for nadir-pointing satellites.", trap: "Watch sign conventions: some define z toward nadir, others away from it." },
      { sym: "CRF / ICRF", dim: "—", desc: "Celestial / Inertial Reference Frame", detail: "Non-rotating frame defined by quasars (radio) via IERS. Closest realization of an inertial system. Star catalogs give positions in ICRF at epoch J2000.", trap: "ICRF is defined by RADIO observations. Star sensors look at STARS. The optical-radio tie introduces a small error." },
      { sym: "TRF / ITRF", dim: "—", desc: "Terrestrial Reference Frame", detail: "Earth-fixed frame, origin at Earth's center of mass. Maintained by IERS.", trap: "" },
    ]
  },
  {
    title: "Rotation Representations", emoji: "🔁", color: "#d97706",
    rows: [
      { sym: "(ê, φ)", dim: "axis+angle", desc: "Axis-angle representation", detail: "Any rotation = rotation by angle φ about axis ê (Euler's theorem). Rotation matrix: R = (1−cos φ)êêᵀ + cos φ I + sin φ [ê×].", trap: "Pairs (ê,φ) and (−ê,−φ) give the SAME rotation." },
      { sym: "R(ê,φ)", dim: "3×3", desc: "Rotation matrix from axis-angle", detail: "R = (1−cos φ)êêᵀ + cos φ I + sin φ [ê×]. Orthogonal: RRᵀ=I, det(R)=+1. The angle is found from tr(R) = 1 + 2cos φ.", trap: "Some textbooks have a sign error in the sin φ term — check your convention!" },
      { sym: "q₁,q₂,q₃,q₄", dim: "4 scalars", desc: "Symmetric Euler parameters (quaternion components)", detail: "q₁=e₁ sin(φ/2), q₂=e₂ sin(φ/2), q₃=e₃ sin(φ/2), q₄=cos(φ/2). Unit norm: q₁²+q₂²+q₃²+q₄²=1.", trap: "Two quaternions ±q map to the SAME rotation (2:1 homomorphism). Watch the sign ambiguity." },
    ]
  },
  {
    title: "Cost Functions & Optimality", emoji: "📊", color: "#dc2626",
    rows: [
      { sym: "L(A)", dim: "scalar", desc: "Wahba's loss function", detail: "L(A) = ½ Σᵢ aᵢ |Wᵢ − AVᵢ|². Minimising L is equivalent to maximising g(A) = tr(ABᵀ).", trap: "Minimise L ⟺ Maximise g(A). Don't confuse the two!" },
      { sym: "g(A)", dim: "scalar", desc: "Gain function", detail: "g(A) = Σᵢ aᵢ Wᵢ·AVᵢ = tr(ABᵀ). The maximum of g(A) over proper orthogonal A gives the optimal attitude.", trap: "" },
      { sym: "P_qq", dim: "3×3", desc: "Attitude error covariance (QUEST)", detail: "P_qq = (1/(λ_max²−σ²))(I₃ − Σᵢ aᵢ Wᵢ Wᵢᵀ). Gives error in quaternion vector components. For angle errors: σ²_angle = P_ii.", trap: "This is the covariance of ERROR QUATERNION components, not angles directly. Angles: multiply by 2." },
    ]
  },
];

// ─── MODULE DATA ────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: "intro",
    num: "1",
    title: "Spacecraft Attitude & ACS Overview",
    pages: "pp. 1–4",
    icon: "🛰️",
    overview: {
      why: "Before we can DETERMINE attitude, we must understand WHAT attitude is and WHY it matters. Every spacecraft operation — manoeuvres, communications, science observations — depends on knowing and controlling where the spacecraft is pointing.",
      objective: "Understand the role of the Attitude Control System (ACS), its components (sensors + software + actuators), and the distinction between passive and active control.",
      realMission: "Cassini: lacking an articulated platform, the entire spacecraft had to reorient itself to switch between remote sensing, communication, and manoeuvring. Attitude knowledge was mission-critical."
    },
    equations: [
      {
        name: "Attitude matrix relation",
        eq: "Wᵢ = A · Vᵢ",
        explain: "The attitude matrix A rotates a reference unit vector Vᵢ (known in ICRF from the star catalog) into the body-frame observation Wᵢ (measured by the sensor). Finding A is the central problem of attitude determination."
      }
    ],
    derivation: `**What is spacecraft attitude?**
The spatial orientation of a spacecraft relative to a reference frame (usually ICRF or the orbital frame).

**Why does it matter?** (Prof. Iess's list from the notes)
1. Orbital manoeuvres → satellite must be pointed in the correct thrust direction
2. GEO telecom satellites → antennas must point at specific Earth regions
3. Spin-stabilised satellites → spin axis must maintain a fixed direction
4. Nadir-pointing 3-axis-stabilised → Euler angles ≈ 0 relative to orbital frame (most Earth observation & telecom satellites)
5. Earth observation → cameras must track ground targets
6. Astronomical telescopes → point at celestial targets
7. Planetary spacecraft (Cassini) → whole body reorients to point instruments

**The ACS must:**
1. DETERMINE the attitude (sensors → software → estimate)
2. CONTROL the attitude (software → actuators → torques)

**ACS components:**
• Sensors: star trackers, Earth sensors, Sun sensors, gyroscopes
• Software: attitude determination + control algorithms (TRIAD, QUEST, EKF, PID, etc.)
• Actuators: thrusters, magnetic torqrods, reaction wheels

**Passive vs Active control:**
• Passive: gravity gradient, spin stabilisation — simple, low accuracy, rarely used now
• Active: sensors + software + actuators — complex, expensive, but far more accurate`,
    matlab: `% Attitude determination overview — simple rotation demo
% Demonstrate that A rotates V into W

% Define a rotation: 30 degrees about z-axis
phi = deg2rad(30);
e = [0; 0; 1]; % rotation axis
A = cos(phi)*eye(3) + (1-cos(phi))*(e*e') + sin(phi)*[0 -e(3) e(2); e(3) 0 -e(1); -e(2) e(1) 0];

% A known star direction in ICRF
V = [1; 0; 0]; % e.g., Vega direction (simplified)

% What the sensor measures
W = A * V;

fprintf('Reference vector V = [%.3f, %.3f, %.3f]\\n', V);
fprintf('Measured vector  W = [%.3f, %.3f, %.3f]\\n', W);
fprintf('A is orthogonal: A*A'' = I? max error = %.2e\\n', max(max(abs(A*A'-eye(3)))));
fprintf('det(A) = %.6f (must be +1)\\n', det(A));`,
    examTraps: [
      "Don't confuse attitude DETERMINATION (finding the orientation) with attitude CONTROL (maintaining it).",
      "The professor often starts with 'What is attitude?' — answer: spatial orientation of the spacecraft body frame relative to a reference frame, described by the 3×3 orthogonal attitude matrix A.",
      "Know the full list of ACS components: sensors, software, actuators. Missing any one loses marks.",
      "Passive control exists (gravity gradient, spin) but is rarely used today — know WHY: low accuracy, cannot meet modern pointing requirements."
    ],
    drill: [
      { q: "Name the 3 fundamental components of an ACS.", a: "1) Attitude sensors (star trackers, Earth sensors, Sun sensors, gyros), 2) Attitude determination and control software, 3) Actuators (thrusters, magnetic torqrods, reaction wheels)." },
      { q: "Why must Cassini reorient its entire body to observe different targets?", a: "Because Cassini lacks an articulated (steerable) instrument platform. All instruments are body-fixed, so pointing any instrument at a target requires rotating the whole spacecraft." },
      { q: "What is the mathematical definition of attitude?", a: "The orientation of the spacecraft body frame relative to a reference frame (ICRF or orbital frame), described by the attitude matrix A — a 3×3 proper orthogonal matrix (AᵀA = I, det A = +1)." }
    ]
  },
  {
    id: "frames",
    num: "2",
    title: "Coordinate Systems",
    pages: "pp. 5–11",
    icon: "📐",
    overview: {
      why: "Attitude determination is meaningless without precisely defined reference frames. Every vector in the attitude problem lives in a specific frame, and confusing frames is the #1 source of errors in implementation.",
      objective: "Master the 7 coordinate frames (OBF, SCF, GCF, SRF, RF, CRF, TRF), understand their physical meaning, and know which frame each quantity lives in.",
      realMission: "GLAS (Geoscience Laser Altimeter System): precise attitude determination is essential because a tiny attitude error at the spacecraft translates to a large position error on the ground for laser altimetry (footprint displacement = altitude × angular error)."
    },
    equations: [
      {
        name: "Frame transformation chain",
        eq: "r_body = A_body←ICRF · r_ICRF",
        explain: "Vectors are transformed between frames via rotation matrices. The full chain is: ICRF → OBF → SCF (or GCF). Each step involves a rotation matrix that may drift slowly over time (thermal deformation, calibration errors)."
      },
      {
        name: "Laser altimetry pointing error",
        eq: "Δx_ground = h · δθ",
        explain: "For GLAS: at altitude h ≈ 600 km, a pointing error δθ = 1 arcsec = 4.85×10⁻⁶ rad gives a ground error Δx ≈ 600000 × 4.85e-6 ≈ 2.9 m. This is why sub-arcsecond attitude knowledge is needed."
      }
    ],
    derivation: `**The 7 coordinate frames (Prof. Iess's notes, pp. 5-7):**

**1) OBF — Optical Bench Frame**
• Fixed to the optical bench (the mechanical structure carrying the instruments)
• Origin: instrument reference point on the bench
• x-OBF: along instrument boresight
• z-OBF: perpendicular to orbital plane (upward)
• y-OBF: completes right-handed system
• Purpose: describe instrument orientations

**2) SCF — Sensor Coordinate Frame**
• Fixed to each individual sensor (ST, ES, SS)
• For a star tracker: z-SCF along boresight direction (BD)
• SCF → OBF rotation is determined by calibration, but drifts slowly due to thermal deformation and internal sensor error
• KEY: a star tracker gives precise knowledge along the boresight but poor rotation knowledge ABOUT the boresight axis

**3) GCF — Gyro Coordinate Frame**
• Defined by the axes of 3 orthogonal gyros in the IRU (Inertial Reference Unit)
• Typically includes a redundant 4th gyro
• Orientation defined relative to OBF

**4) SRF — Spacecraft Reference Frame**
• Body-fixed frame
• THIS is the frame we want to determine and control

**5) RF — Orbital Frame (t,s,w)**
• z-axis: radial (toward or away from central body)
• y-axis: along orbital angular momentum
• x-axis: in the velocity half-plane, completes right-handed frame
• For nadir-pointing satellites: the reference frame against which Euler angle deviations are measured

**6) CRF (ICRF) — Celestial / Inertial Reference Frame**
• Non-rotating frame defined by distant quasars
• Maintained by IERS (International Earth Rotation Service)
• Star catalogs give stellar positions in ICRF at epoch J2000
• NOTE: ICRF is defined by RADIO observations, but star trackers observe OPTICAL stars → there's a small tie error between the two

**7) TRF (ITRF) — Terrestrial Reference Frame**
• Earth-fixed, origin at Earth's center of mass
• Maintained by IERS

**Practical example — GLAS laser altimeter (p. 8-10):**
The laser altimeter on ICESat uses the GLAS instrument. Precise attitude is critical: at 600 km altitude, 1 arcsec error → ~3 m ground displacement. The system includes a laser, laser ranging telescope, laser reference sensor, and star tracker — all with precisely known orientations in the OBF.`,
    matlab: `% Demonstrate frame transformations and pointing error
% Scenario: GLAS laser altimetry on ICESat

% Altitude
h = 600e3; % [m] ICESat altitude

% Pointing errors to evaluate [arcsec]
delta_theta_arcsec = [0.1, 0.5, 1, 5, 10];
delta_theta_rad = delta_theta_arcsec * (pi/180/3600);

% Ground displacement
delta_x = h * delta_theta_rad;

fprintf('GLAS Laser Altimetry — Pointing Error vs Ground Displacement\\n');
fprintf('Altitude = %.0f km\\n\\n', h/1e3);
fprintf('%10s  %12s\\n', 'δθ [arcsec]', 'Δx [m]');
fprintf('%s\\n', repmat('-',1,25));
for i = 1:length(delta_theta_arcsec)
    fprintf('%10.1f  %12.2f\\n', delta_theta_arcsec(i), delta_x(i));
end

% Frame rotation example: OBF to SCF
% Suppose star tracker is tilted 90 deg about y-axis
alpha = deg2rad(90);
R_SCF_OBF = [cos(alpha) 0 sin(alpha); 0 1 0; -sin(alpha) 0 cos(alpha)];

v_OBF = [1; 0; 0]; % boresight direction in OBF
v_SCF = R_SCF_OBF * v_OBF;
fprintf('\\nBoresight in OBF: [%.1f, %.1f, %.1f]\\n', v_OBF);
fprintf('Same vector in SCF: [%.1f, %.1f, %.1f]\\n', v_SCF);`,
    examTraps: [
      "ICRF is defined by RADIO observations (quasars), not by stars. Star sensors observe in the OPTICAL domain. There is a small tie error between the two frames.",
      "The professor asks: 'What corrections must be applied to star catalog positions?' Answer: proper motion, parallax, aberration. If you forget aberration, that's a problem.",
      "OBF and SCF are NOT the same frame — there is a slowly drifting rotation between them due to thermal deformation.",
      "Know the orbital frame convention: z radial, y angular momentum, x velocity. This differs from many textbooks that use z nadir."
    ],
    drill: [
      { q: "List the 7 coordinate frames used in attitude determination and their acronyms.", a: "OBF (Optical Bench Frame), SCF (Sensor Coordinate Frame), GCF (Gyro Coordinate Frame), SRF (Spacecraft Reference Frame), RF (Orbital Frame), CRF/ICRF (Celestial/Inertial Reference Frame), TRF/ITRF (Terrestrial Reference Frame)." },
      { q: "Why is sub-arcsecond attitude knowledge critical for a laser altimeter at 600 km altitude?", a: "Because ground displacement ≈ h × δθ. At h=600 km, 1 arcsec error → ~3 m ground error. Laser altimetry requires cm-level accuracy, so attitude must be known to ~0.1 arcsec or better." },
      { q: "What 3 corrections must be applied to star catalog positions before using them for attitude determination?", a: "1) Proper motion (stars move: several arcsec over years), 2) Parallax (<0.8 arcsec, due to spacecraft motion around the Sun), 3) Aberration of light (up to 20 arcsec for planetary spacecraft, ~6 arcsec for LEO)." }
    ]
  },
  {
    id: "triad",
    num: "3",
    title: "TRIAD Algorithm",
    pages: "pp. 12–13",
    icon: "🔺",
    overview: {
      why: "TRIAD is the simplest attitude determination algorithm. It gives us a DETERMINISTIC (not optimal) attitude from exactly two vector observations. It's the baseline you must understand before moving to Wahba/QUEST.",
      objective: "Derive the TRIAD algorithm step-by-step, understand why it's not optimal, and know when to use it vs. QUEST.",
      realMission: "Early satellites with limited computing power (e.g., using one Sun sensor + one Earth sensor) used TRIAD for real-time attitude determination."
    },
    equations: [
      {
        name: "TRIAD formula",
        eq: "A = [r₁ r₂ r₃] · [s₁ s₂ s₃]ᵀ",
        explain: "Construct an orthonormal triad {rₖ} from the body-frame measurements W₁, W₂ and a triad {sₖ} from the ICRF references V₁, V₂. The attitude matrix is A = M_body · M_ref⁻¹ = M_body · M_refᵀ (since M_ref is orthogonal)."
      },
      {
        name: "Body-frame triad construction",
        eq: "r₁ = W₁,  r₂ = (W₁×W₂)/|W₁×W₂|,  r₃ = r₁×r₂",
        explain: "Start from W₁ (first measurement), construct r₂ perpendicular to both W₁ and W₂ (normalised cross product), then r₃ completes the right-handed triad."
      },
      {
        name: "Reference-frame triad construction",
        eq: "s₁ = V₁,  s₂ = (V₁×V₂)/|V₁×V₂|,  s₃ = s₁×s₂",
        explain: "Identical construction using the known catalog vectors V₁, V₂ in ICRF."
      }
    ],
    derivation: `**The TRIAD Algorithm — Step by Step (pp. 12-13)**

**Problem:** Given two unit vector pairs (W₁,V₁) and (W₂,V₂), find the attitude matrix A such that Wᵢ = AVᵢ.

**Key insight:** We have 6 scalar equations (two 3×1 vector equations) but only 3 unknowns (A has 3 DOF since it must be orthogonal). So two vectors OVER-determine the problem — but TRIAD uses them without optimality.

**Step 1 — Build an orthonormal triad from the MEASUREMENTS (body frame):**
• r₁ = W₁  (use first measurement vector directly)
• r₂ = (W₁ × W₂) / |W₁ × W₂|  (perpendicular to both, normalised)
• r₃ = r₁ × r₂  (completes the right-handed triad)

**Step 2 — Build an orthonormal triad from the CATALOG vectors (ICRF):**
• s₁ = V₁
• s₂ = (V₁ × V₂) / |V₁ × V₂|
• s₃ = s₁ × s₂

**Step 3 — Compute the attitude matrix:**
Since the triads are orthonormal:
  A [s₁ s₂ s₃] = [r₁ r₂ r₃]
  ⟹  A = [r₁ r₂ r₃] [s₁ s₂ s₃]ᵀ

This works because [s₁ s₂ s₃] is orthogonal, so its inverse is its transpose.

**Why TRIAD is NOT optimal:**
• It treats W₁ as exact (no error) — ALL measurement error is absorbed by W₂
• There is no weighting — sensor accuracies are ignored
• Different choices of "primary" vector give different results
• Only uses 2 observations — cannot exploit additional measurements

**When to use TRIAD:**
• Quick initial attitude estimate (e.g., for "lost in space" recovery)
• Very limited computing resources
• As an initial guess for iterative methods`,
    matlab: `% TRIAD Algorithm — Complete MATLAB Implementation
% Given: two measurement vectors W1,W2 (body frame)
%        two reference vectors V1,V2 (ICRF)
% Output: attitude matrix A

function A = triad(W1, W2, V1, V2)
    % Step 1: Build body-frame triad
    r1 = W1 / norm(W1);          % ensure unit vector
    r2 = cross(W1, W2);
    r2 = r2 / norm(r2);          % normalise
    r3 = cross(r1, r2);

    % Step 2: Build reference-frame triad
    s1 = V1 / norm(V1);
    s2 = cross(V1, V2);
    s2 = s2 / norm(s2);
    s3 = cross(s1, s2);

    % Step 3: Compute attitude matrix
    M_body = [r1, r2, r3];       % 3x3: columns are body triad
    M_ref  = [s1, s2, s3];       % 3x3: columns are ref triad
    A = M_body * M_ref';         % A maps ICRF -> body
end

% ─── NUMERICAL EXAMPLE ───
% True attitude: 20 deg rotation about [1,1,1]/sqrt(3)
phi_true = deg2rad(20);
e = [1;1;1]/sqrt(3);
ex = [0 -e(3) e(2); e(3) 0 -e(1); -e(2) e(1) 0];
A_true = cos(phi_true)*eye(3) + (1-cos(phi_true))*(e*e') + sin(phi_true)*ex;

% Two stars in ICRF (from catalog)
V1 = [1; 0; 0];  % e.g., Vega direction (simplified)
V2 = [0; 1; 0];  % e.g., Polaris direction (simplified)

% Sensor measurements (with small noise)
noise_level = 1e-4; % ~20 arcsec
W1 = A_true*V1 + noise_level*randn(3,1); W1 = W1/norm(W1);
W2 = A_true*V2 + noise_level*randn(3,1); W2 = W2/norm(W2);

% Run TRIAD
A_est = triad(W1, W2, V1, V2);

% Check results
fprintf('TRIAD Attitude Determination\\n');
fprintf('True attitude matrix:\\n'); disp(A_true);
fprintf('Estimated attitude matrix:\\n'); disp(A_est);
fprintf('Error (Frobenius norm): %.6e\\n', norm(A_est - A_true, 'fro'));
fprintf('Orthogonality check: max|A*A''-I| = %.2e\\n', max(abs(A_est*A_est'-eye(3)),[],'all'));
fprintf('det(A_est) = %.6f\\n', det(A_est));`,
    examTraps: [
      "TRIAD is NOT optimal — this is a classic exam trap. The professor asks 'Is TRIAD optimal?' and the answer is NO. QUEST is the optimal method.",
      "TRIAD requires exactly 2 observations at the SAME TIME. The professor asks: 'What if the two W vectors come from different time instants?' Answer: TRIAD fails because the attitude has changed between measurements.",
      "If the two vectors W₁ and W₂ are nearly parallel, the cross product is poorly determined → TRIAD gives huge errors. The professor asks: 'If I have one star tracker with 8°×8° FOV, should I pick two stars from the same tracker for TRIAD?' Answer: Better to use two different star trackers to ensure the vectors have large angular separation.",
      "TRIAD gives different results depending on which vector you choose as 'primary' (r₁). This asymmetry is a fundamental weakness."
    ],
    drill: [
      { q: "Write the 3 steps of the TRIAD algorithm.", a: "1) Build orthonormal triad from body measurements: r₁=W₁, r₂=(W₁×W₂)/|W₁×W₂|, r₃=r₁×r₂. 2) Build orthonormal triad from ICRF references: s₁=V₁, s₂=(V₁×V₂)/|V₁×V₂|, s₃=s₁×s₂. 3) Compute A = [r₁ r₂ r₃][s₁ s₂ s₃]ᵀ." },
      { q: "Why is TRIAD not optimal? What should you use instead?", a: "TRIAD treats one measurement as exact (assigns zero error to W₁). It ignores sensor weights, cannot use more than 2 observations, and gives different answers depending on which vector is 'primary'. Use QUEST (or SVD) instead — they solve the Wahba problem optimally using all available observations." },
      { q: "Two stars are at 3° angular separation in the FOV. Is TRIAD reliable?", a: "No — when vectors are nearly parallel, their cross product has very small magnitude, making the normalised cross product numerically unstable. Large errors result. For TRIAD, the two observation vectors should have large angular separation (ideally near 90°)." }
    ]
  },
  {
    id: "wahba",
    num: "4",
    title: "The Wahba Problem",
    pages: "pp. 14–17",
    icon: "📊",
    overview: {
      why: "The Wahba problem is the rigorous mathematical formulation of OPTIMAL attitude determination from multiple vector observations. Everything downstream (QUEST, SVD, q-method) is a SOLUTION METHOD for Wahba's problem.",
      objective: "State the Wahba problem, derive the reduction to g(A) = tr(ABᵀ), understand the role of the attitude profile matrix B, and know the trace identities used in the derivation.",
      realMission: "Any modern spacecraft with multiple attitude sensors: all star tracker measurements are combined optimally via a Wahba-based algorithm."
    },
    equations: [
      {
        name: "Wahba's loss function",
        eq: "L(A) = ½ Σᵢ aᵢ |Wᵢ − AVᵢ|²",
        explain: "Find the proper orthogonal A that MINIMISES this weighted sum of squared residuals. aᵢ are weights (reflecting sensor accuracy), n is the number of simultaneous observations."
      },
      {
        name: "Reduced form (gain function)",
        eq: "g(A) = tr(ABᵀ)  where  B = Σᵢ aᵢ WᵢVᵢᵀ",
        explain: "If weights are normalised (Σaᵢ=1), then L(A) = 1 − g(A). So minimising L ⟺ maximising g(A) = tr(ABᵀ). The matrix B is the ATTITUDE PROFILE MATRIX."
      },
      {
        name: "Attitude profile matrix",
        eq: "B = Σᵢ₌₁ⁿ aᵢ Wᵢ Vᵢᵀ",
        explain: "B encodes ALL the observation information. Every Wahba solution (QUEST, SVD, q-method) is computed from B. It is a 3×3 matrix but in general NOT symmetric and NOT orthogonal."
      }
    ],
    derivation: `**Deriving the Wahba Problem (pp. 14-17)**

**Starting point:** We have n pairs of unit vectors (Wᵢ, Vᵢ) with weights aᵢ.

**Step 1 — Expand the loss function:**
L(A) = ½ Σᵢ aᵢ |Wᵢ − AVᵢ|²
     = ½ Σᵢ aᵢ (Wᵢ − AVᵢ)ᵀ(Wᵢ − AVᵢ)
     = ½ Σᵢ aᵢ [WᵢᵀWᵢ + VᵢᵀAᵀAVᵢ − 2WᵢᵀAVᵢ]

Since Wᵢ and Vᵢ are UNIT vectors: |Wᵢ|² = |Vᵢ|² = 1
And A is orthogonal: AᵀA = I, so VᵢᵀAᵀAVᵢ = VᵢᵀVᵢ = 1

**Step 2 — Simplify (assuming Σaᵢ = 1):**
L(A) = ½ Σᵢ aᵢ [1 + 1 − 2WᵢᵀAVᵢ]
     = Σᵢ aᵢ − Σᵢ aᵢ WᵢᵀAVᵢ
     = 1 − Σᵢ aᵢ Wᵢ · (AVᵢ)
     = 1 − g(A)

**Step 3 — Define the gain function g(A):**
g(A) = Σᵢ aᵢ Wᵢᵀ A Vᵢ = Σᵢ aᵢ tr(WᵢᵀAVᵢ)

Using the trace identity: wᵀAv = tr(wᵀAv) = tr(Avwᵀ) (cyclic permutation)

g(A) = tr(A Σᵢ aᵢ VᵢWᵢᵀ) = tr(ABᵀ)

where B = Σᵢ aᵢ WᵢVᵢᵀ  (the attitude profile matrix)

**Key trace identities used (p. 16):**
• tr(abᵀ) = aᵀb = a · b  (trace of outer product = dot product)
• tr(ABC) = tr(CAB) = tr(BCA)  (cyclic permutation)
• tr(Aᵀ) = tr(A)
• tr(A+B) = tr(A) + tr(B)

**Summary:**
Minimise L(A) ⟺ Maximise g(A) = tr(ABᵀ)
over all proper orthogonal matrices A.`,
    matlab: `% Wahba Problem — Build the attitude profile matrix B
% and evaluate the loss function for a given attitude

% True attitude (30 deg about z-axis)
phi = deg2rad(30);
A_true = [cos(phi) -sin(phi) 0; sin(phi) cos(phi) 0; 0 0 1];

% Generate n star observations
n = 5; % number of observed stars
V = zeros(3,n); W = zeros(3,n);
a = ones(1,n)/n;  % equal weights, sum to 1

rng(42); % reproducible
for i = 1:n
    v = randn(3,1); v = v/norm(v);  % random star direction in ICRF
    V(:,i) = v;
    W(:,i) = A_true * v + 1e-4*randn(3,1);  % body measurement + noise
    W(:,i) = W(:,i)/norm(W(:,i));  % re-normalise
end

% Build attitude profile matrix B
B = zeros(3);
for i = 1:n
    B = B + a(i) * W(:,i) * V(:,i)';
end

% Evaluate gain function for different matrices
g_true = trace(A_true * B');
g_ident = trace(eye(3) * B');

fprintf('Wahba Problem Demonstration\\n');
fprintf('Attitude profile matrix B:\\n'); disp(B);
fprintf('g(A_true)  = %.6f  (should be close to 1)\\n', g_true);
fprintf('g(I)       = %.6f  (should be smaller)\\n', g_ident);
fprintf('L(A_true)  = %.6f  (should be close to 0)\\n', 1 - g_true);
fprintf('L(I)       = %.6f  (should be larger)\\n\\n', 1 - g_ident);
fprintf('=> The true attitude MAXIMISES g(A) and MINIMISES L(A).\\n');`,
    examTraps: [
      "The weights must satisfy Σaᵢ = 1 for the simplified form L = 1 − g(A). If the professor asks 'what if weights don't sum to 1?' you need the full form.",
      "B is NOT symmetric. Don't assume symmetry. The symmetric part S = B+Bᵀ appears later in QUEST.",
      "tr(ABᵀ) uses CYCLIC PERMUTATION of the trace. Know the trace identities cold — the professor tests them.",
      "Wahba's problem asks for a PROPER orthogonal matrix (det A = +1). Forgetting the determinant constraint is a common error."
    ],
    drill: [
      { q: "State the Wahba problem in one sentence.", a: "Find the proper orthogonal matrix A that minimises the weighted sum L(A) = ½ Σᵢ aᵢ |Wᵢ − AVᵢ|², where Wᵢ are body-frame observations, Vᵢ are ICRF reference vectors, and aᵢ are weights." },
      { q: "What is the attitude profile matrix? Write its formula.", a: "B = Σᵢ aᵢ Wᵢ Vᵢᵀ. It's a 3×3 matrix encoding all observation information. Minimising Wahba's loss is equivalent to maximising g(A) = tr(ABᵀ)." },
      { q: "Show that tr(abᵀ) = aᵀb for column vectors a, b.", a: "abᵀ is a 3×3 matrix with elements (abᵀ)ᵢⱼ = aᵢbⱼ. Its trace = Σᵢ aᵢbᵢ = aᵀb = a·b. This is because the trace picks out the diagonal elements where i=j." }
    ]
  },
  {
    id: "quest",
    num: "5",
    title: "The QUEST Algorithm",
    pages: "pp. 18–28",
    icon: "⭐",
    overview: {
      why: "QUEST (QUaternion ESTimation) is the OPTIMAL and most widely used algorithm for solving the Wahba problem. It transforms the maximisation into a 4×4 eigenvalue problem for quaternions. This is the algorithm you will be asked about in the exam with equations.",
      objective: "Derive how g(A) is rewritten in terms of quaternions, build the K-matrix, understand the eigenvalue problem, and compute the attitude covariance.",
      realMission: "Used on virtually every modern satellite. The QUEST quaternion can also be used as a measurement in the attitude EKF."
    },
    equations: [
      {
        name: "Rotation matrix in terms of quaternion",
        eq: "A(q) = (q₄² − q⃗ᵀq⃗)I + 2q⃗q⃗ᵀ + 2q₄[q⃗×]",
        explain: "This links the 3×3 attitude matrix to the 4×1 quaternion. [q⃗×] is the skew-symmetric matrix of q⃗. Essential for rewriting g(A) in quaternion form."
      },
      {
        name: "Gain function in quaternion form",
        eq: "g(q) = qᵀKq",
        explain: "The Wahba gain function becomes a quadratic form in the quaternion. K is the 4×4 Davenport matrix. Maximising g subject to |q|=1 gives the eigenvalue problem Kq = λq."
      },
      {
        name: "K-matrix (Davenport's matrix)",
        eq: "K = [ S−σI₃,  Z ;  Zᵀ,  σ ]",
        explain: "S = B+Bᵀ (symmetric part), σ = tr(B) (trace), Z = Σᵢ aᵢ(Wᵢ×Vᵢ) (cross-product vector). K is 4×4 and SYMMETRIC → real eigenvalues."
      },
      {
        name: "QUEST eigenvalue problem",
        eq: "Kq_opt = λ_max · q_opt",
        explain: "The optimal quaternion is the eigenvector of K corresponding to its largest eigenvalue. λ_max ≈ 1, found iteratively by Newton-Raphson starting from λ₀=1."
      },
      {
        name: "Attitude error covariance",
        eq: "P_qq = (1/(λ_max² − σ²)) · [I₃ − Σᵢ aᵢ Wᵢ Wᵢᵀ]",
        explain: "Under assumptions: error vectors ⊥ to V and W, symmetrically distributed, attitude-independent errors. σ²_i,total = σ²_ST,i + σ²_catalog,i. For angle errors: σ²_angle ≈ 4·P_qq diagonal."
      }
    ],
    derivation: `**Deriving the QUEST Algorithm (pp. 18-28) — Full Step-by-Step**

**Starting point:** Maximise g(A) = tr(ABᵀ) where A is proper orthogonal.

**Step 1 — Express A(q) in terms of quaternion (p. 18):**
A(q) = (q₄² − q⃗ᵀq⃗)I₃ + 2q⃗q⃗ᵀ + 2q₄[q⃗×]

where [q⃗×] is the skew-symmetric matrix of q⃗ = [q₁,q₂,q₃]ᵀ.

**Step 2 — Substitute into g(A) = tr(ABᵀ) (pp. 18-22):**
g(q) = tr[(q₄² − q⃗ᵀq⃗)Bᵀ + 2q⃗q⃗ᵀBᵀ + 2q₄[q⃗×]Bᵀ]

Break into 3 terms:

**Term 1:** (q₄² − q⃗ᵀq⃗) tr(Bᵀ) = (q₄² − q⃗ᵀq⃗)σ,  where σ = tr(B)

**Term 2:** 2 tr(q⃗q⃗ᵀBᵀ) = 2 q⃗ᵀBᵀq⃗ = 2q⃗ᵀSq⃗  [after algebraic manipulation showing that the symmetric part S = B+Bᵀ enters, since q⃗q⃗ᵀ is symmetric]
Actually more carefully: 2 tr(q⃗q⃗ᵀBᵀ) = 2q⃗ᵀBq⃗ which after symmetrisation gives q⃗ᵀ(B+Bᵀ)q⃗ = q⃗ᵀSq⃗

Wait — let's be precise with the notes (pp. 20-21):
2q⃗ᵀBq⃗ = q⃗ᵀBq⃗ + q⃗ᵀBᵀq⃗ = q⃗ᵀ(B+Bᵀ)q⃗ = q⃗ᵀSq⃗

**Term 3:** 2q₄ tr([q⃗×]Bᵀ) = 2q₄ q⃗·Z  where Z = Σᵢ aᵢ(Wᵢ×Vᵢ)
(The derivation on pp. 21-22 shows this using the relation tr([a×]M) = a·z where z captures the antisymmetric part of M)

**Step 3 — Assemble as a quadratic form (pp. 22-23):**
g(q) = q₄²σ − q⃗ᵀq⃗σ + q⃗ᵀSq⃗ + 2q₄Zᵀq⃗
     = q⃗ᵀ(S−σI₃)q⃗ + 2q₄Zᵀq⃗ + q₄²σ
     = [q⃗ᵀ q₄] · K · [q⃗; q₄]  =  qᵀKq

where the 4×4 matrix K is:
K = ┌ S−σI₃   Z  ┐
    └  Zᵀ      σ  ┘

**Step 4 — Constrained maximisation → eigenvalue problem:**
Maximise qᵀKq  subject to  qᵀq = 1
Lagrange: ∂/∂q [qᵀKq − λ(qᵀq − 1)] = 2Kq − 2λq = 0
⟹  Kq = λq

The optimal quaternion = eigenvector of K for the LARGEST eigenvalue λ_max.

**Step 5 — Finding λ_max efficiently:**
λ_max ≈ 1 (close to unity). Solve the 4th-order characteristic equation det(K−λI) = 0 using Newton-Raphson starting from λ₀ = 1. Convergence is very fast (2-3 iterations).

**Step 6 — Attitude covariance (pp. 27-28):**
Under the assumptions that:
• error vectors δV, δW are ⊥ to V, W (unit vector constraint)
• errors are symmetrically distributed in the plane ⊥ to V and W
• attitude error is independent of spacecraft orientation

P_qq = (1/(λ_max² − σ²)) · [I₃ − Σᵢ aᵢ Wᵢ Wᵢᵀ]

For angle errors: since q₁ ≈ δφ/2 etc. for small errors,
σ²_angle = 4 · P_qq_diagonal
Total σ²_i = σ²_ST + σ²_catalog  for each observation.`,
    matlab: `% QUEST Algorithm — Complete MATLAB Implementation
% Solves the Wahba problem via eigenvalue decomposition of the K matrix

function [q_opt, A_opt, lambda_max, P_qq] = quest(W, V, a)
    % W: 3xn matrix, columns = body-frame unit vectors
    % V: 3xn matrix, columns = ICRF unit vectors
    % a: 1xn weight vector (sum = 1)
    % Returns: optimal quaternion, attitude matrix, max eigenvalue, covariance

    n = size(W, 2);

    % Step 1: Build attitude profile matrix B
    B = zeros(3);
    for i = 1:n
        B = B + a(i) * W(:,i) * V(:,i)';
    end

    % Step 2: Compute S, sigma, Z
    S = B + B';               % symmetric part
    sigma = trace(B);         % scalar trace
    Z = zeros(3,1);           % cross-product vector
    for i = 1:n
        Z = Z + a(i) * cross(W(:,i), V(:,i));
    end

    % Step 3: Build the 4x4 K matrix (Davenport's matrix)
    K = [S - sigma*eye(3), Z;
         Z',               sigma];

    % Step 4: Eigenvalue decomposition
    [Evec, Eval] = eig(K);
    eigenvalues = diag(Eval);
    [lambda_max, idx] = max(eigenvalues);
    q_opt = Evec(:, idx);

    % Ensure q4 > 0 convention
    if q_opt(4) < 0
        q_opt = -q_opt;
    end

    % Step 5: Convert quaternion to rotation matrix
    q1 = q_opt(1); q2 = q_opt(2); q3 = q_opt(3); q4 = q_opt(4);
    qv = q_opt(1:3);
    qx = [0 -q3 q2; q3 0 -q1; -q2 q1 0]; % skew-symmetric
    A_opt = (q4^2 - qv'*qv)*eye(3) + 2*(qv*qv') + 2*q4*qx;

    % Step 6: Attitude error covariance
    WWT = zeros(3);
    for i = 1:n
        WWT = WWT + a(i) * W(:,i) * W(:,i)';
    end
    P_qq = (1/(lambda_max^2 - sigma^2)) * (eye(3) - WWT);
end

% ─── NUMERICAL EXAMPLE ───
fprintf('=== QUEST Algorithm Demo ===\\n\\n');

% True attitude: 25 deg about [1,2,3]/norm
phi_true = deg2rad(25);
e = [1;2;3]/norm([1;2;3]);
ex = [0 -e(3) e(2); e(3) 0 -e(1); -e(2) e(1) 0];
A_true = cos(phi_true)*eye(3) + (1-cos(phi_true))*(e*e') + sin(phi_true)*ex;

% Generate star observations
n = 6;
V = zeros(3,n); W = zeros(3,n);
a = ones(1,n)/n;
rng(123);
for i = 1:n
    v = randn(3,1); v = v/norm(v);
    V(:,i) = v;
    W(:,i) = A_true*v + 5e-5*randn(3,1);
    W(:,i) = W(:,i)/norm(W(:,i));
end

% Run QUEST
[q, A_est, lam, P] = quest(W, V, a);

fprintf('Optimal quaternion: [%.6f, %.6f, %.6f, %.6f]\\n', q);
fprintf('Largest eigenvalue: %.8f (close to 1)\\n', lam);
fprintf('\\nAttitude error (Frobenius): %.2e\\n', norm(A_est-A_true,'fro'));
fprintf('det(A_est) = %.8f\\n', det(A_est));
fprintf('\\nAttitude covariance P_qq diagonal:\\n');
fprintf('  sigma_q1 = %.2e rad => %.2f arcsec\\n', sqrt(P(1,1)), 2*sqrt(P(1,1))*180/pi*3600);
fprintf('  sigma_q2 = %.2e rad => %.2f arcsec\\n', sqrt(P(2,2)), 2*sqrt(P(2,2))*180/pi*3600);
fprintf('  sigma_q3 = %.2e rad => %.2f arcsec\\n', sqrt(P(3,3)), 2*sqrt(P(3,3))*180/pi*3600);`,
    examTraps: [
      "The professor asks: 'What is the K matrix? Write it.' — You MUST write the 4×4 block form: K = [S−σI₃, Z; Zᵀ, σ]. Know what S, σ, Z are.",
      "λ_max is very close to 1, NOT exactly 1. The professor may ask: 'How do you find λ_max?' Answer: Newton-Raphson on the characteristic equation, starting from λ₀=1.",
      "Don't confuse σ = tr(B) (a scalar from the Wahba problem) with σ as standard deviation. Context matters!",
      "The covariance P_qq refers to ERROR QUATERNION components (q₁,q₂,q₃). For actual angle errors, recall qᵢ ≈ δφᵢ/2 for small angles, so σ²_angle ≈ 4·P_qq diagonal.",
      "From the oral exam questions: 'QUEST — in cosa consiste e tutto, le equazioni solo le principali' means know the K matrix, eigenvalue problem, and covariance formula. Don't memorise every intermediate step — know the KEY equations.",
      "Why quaternions and not Euler angles? Because quaternions have no singularity (gimbal lock), don't require trig functions, and satisfy linear differential equations."
    ],
    drill: [
      { q: "Write the K matrix for the QUEST algorithm and define each component.", a: "K = [S−σI₃, Z; Zᵀ, σ] (4×4). S = B+Bᵀ (3×3 symmetric), σ = tr(B) (scalar), Z = Σᵢ aᵢ(Wᵢ×Vᵢ) (3×1 vector). The optimal quaternion is the eigenvector of K for the largest eigenvalue λ_max." },
      { q: "How does QUEST find the optimal quaternion?", a: "It builds the 4×4 symmetric K matrix from the observations, then solves the eigenvalue problem Kq = λq. The eigenvector corresponding to the largest eigenvalue λ_max is the optimal attitude quaternion. λ_max ≈ 1 and is found by Newton-Raphson." },
      { q: "What assumptions are needed for the QUEST attitude covariance formula?", a: "Three assumptions: 1) Error vectors δV, δW are orthogonal to V and W (unit vector constraint), 2) Errors are symmetrically distributed in the plane normal to V and W, 3) Attitude error is independent of spacecraft orientation." }
    ]
  },
  {
    id: "svd",
    num: "6",
    title: "SVD Algorithm & SFAD Methods",
    pages: "p. 29",
    icon: "🔢",
    overview: {
      why: "The SVD (Singular Value Decomposition) method is an elegant alternative to QUEST for solving the Wahba problem. Together with QUEST, it belongs to the SFAD (Single Frame Attitude Determination) family — methods using measurements at a SINGLE time instant.",
      objective: "Understand how SVD decomposes B, how the optimal A is obtained, and the classification of SFAD methods.",
      realMission: "SVD is more numerically robust than QUEST for certain edge cases. Both are used interchangeably in modern AOCS software."
    },
    equations: [
      {
        name: "SVD of B",
        eq: "B = U · diag(s₁, s₂, s₃) · Vᵀ",
        explain: "U and V are orthogonal matrices, s₁ ≥ s₂ ≥ s₃ ≥ 0 are the singular values of B."
      },
      {
        name: "Optimal attitude from SVD",
        eq: "A = U · diag(1, 1, det(U)det(V)) · Vᵀ",
        explain: "The diag factor ensures det(A)=+1 (proper orthogonal). If det(U)det(V) = +1, then A = UVᵀ simply. If det(U)det(V) = −1, the third diagonal entry becomes −1."
      },
      {
        name: "Maximised gain",
        eq: "g(A) = s₁ + s₂ + det(U)det(V) · s₃",
        explain: "This follows from tr(ABᵀ) = tr(diag(...)·Σ) under cyclic permutation of the trace."
      }
    ],
    derivation: `**SVD Solution to the Wahba Problem (p. 29)**

**Step 1:** Decompose the attitude profile matrix B using SVD:
B = U · S · Vᵀ
where U, V are orthogonal, S = diag(s₁, s₂, s₃) with s₁ ≥ s₂ ≥ s₃ ≥ 0.

**Step 2:** Use the cyclic permutation of the trace:
g(A) = tr(ABᵀ) = tr(A · V · S · Uᵀ) = tr(UᵀAV · S)

Let M = UᵀAV. Since U, A, V are all orthogonal, M is orthogonal too.
We want to maximise tr(M · S) = Σᵢ Mᵢᵢ sᵢ.

For an orthogonal M with det(M)=+1 and sᵢ ≥ 0, this is maximised by:
M = diag(1, 1, det(U)det(V))

**Step 3:** Recover A:
A = U · M · Vᵀ = U · diag(1, 1, det(U)det(V)) · Vᵀ

**SFAD Classification:**
Both QUEST and SVD use measurements from a SINGLE time instant tᵢ.
They belong to the Single Frame Attitude Determination (SFAD) family.
This is in contrast to sequential methods (EKF) that combine observations over time.

**Comparison QUEST vs SVD:**
| Feature | QUEST | SVD |
|---------|-------|-----|
| Parameterisation | Quaternion | Rotation matrix |
| Method | 4×4 eigenvalue | 3×3 SVD |
| Singularity | None (quaternion) | None |
| Covariance | Direct formula | Less direct |
| Speed | Very fast | Slightly slower |
| Usage | More common in AOCS | Common in batch processing |`,
    matlab: `% SVD Solution to the Wahba Problem
% Compare with QUEST on the same data

% True attitude (same as QUEST example)
phi_true = deg2rad(25);
e = [1;2;3]/norm([1;2;3]);
ex = [0 -e(3) e(2); e(3) 0 -e(1); -e(2) e(1) 0];
A_true = cos(phi_true)*eye(3) + (1-cos(phi_true))*(e*e') + sin(phi_true)*ex;

% Generate observations
n = 6; a = ones(1,n)/n;
V = zeros(3,n); W = zeros(3,n);
rng(123);
for i = 1:n
    v = randn(3,1); v = v/norm(v);
    V(:,i) = v;
    W(:,i) = A_true*v + 5e-5*randn(3,1);
    W(:,i) = W(:,i)/norm(W(:,i));
end

% Build B
B = zeros(3);
for i = 1:n
    B = B + a(i) * W(:,i) * V(:,i)';
end

% SVD decomposition
[U, Sigma, Vmat] = svd(B);

% Optimal attitude
d = det(U) * det(Vmat);
A_svd = U * diag([1, 1, d]) * Vmat';

% Gain function value
g_svd = Sigma(1,1) + Sigma(2,2) + d*Sigma(3,3);

fprintf('=== SVD Attitude Determination ===\\n\\n');
fprintf('Singular values of B: [%.6f, %.6f, %.6f]\\n', Sigma(1,1), Sigma(2,2), Sigma(3,3));
fprintf('det(U)*det(V) = %.1f\\n', d);
fprintf('g(A_svd) = %.8f\\n', g_svd);
fprintf('\\nSVD Attitude error (Frobenius): %.2e\\n', norm(A_svd-A_true,'fro'));
fprintf('det(A_svd) = %.8f\\n', det(A_svd));
fprintf('Orthogonality: max|A*A''-I| = %.2e\\n', max(abs(A_svd*A_svd'-eye(3)),[],'all'));`,
    examTraps: [
      "The professor may ask: 'What family do QUEST and SVD belong to?' Answer: SFAD (Single Frame Attitude Determination) — they both use observations from a single time instant.",
      "The det(U)det(V) factor in the SVD solution ensures det(A)=+1 (proper rotation). Without it, you might get an improper rotation (reflection).",
      "SVD gives the rotation matrix DIRECTLY — no quaternion conversion needed. But QUEST gives the quaternion directly, which is what the EKF needs."
    ],
    drill: [
      { q: "How does the SVD method solve the Wahba problem? State the key formula.", a: "Decompose B = UΣVᵀ via SVD. The optimal attitude is A = U·diag(1,1,det(U)det(V))·Vᵀ. The diag factor ensures det(A)=+1 (proper orthogonal)." },
      { q: "What does SFAD stand for and what methods belong to it?", a: "SFAD = Single Frame Attitude Determination. Both QUEST and SVD are SFAD methods — they use observations from a single time instant tᵢ. In contrast, the attitude EKF is a sequential method combining observations over time." },
      { q: "When would you prefer SVD over QUEST?", a: "SVD can be more numerically robust in edge cases. It gives the rotation matrix directly (no quaternion). It's also conceptually simpler. However, QUEST is faster and gives the quaternion directly, which is needed for the attitude EKF." }
    ]
  },
  {
    id: "kinematics",
    num: "7",
    title: "Attitude Kinematics (Quaternion Representations)",
    pages: "p. 30 + Appendix A",
    icon: "🔄",
    overview: {
      why: "Before studying the sensors and the EKF, you need to understand HOW attitude is REPRESENTED mathematically. Quaternions are the standard — they avoid singularities (gimbal lock), don't need trig functions, and satisfy linear differential equations.",
      objective: "Know the 4 attitude representations (Euler angles, DCM, axis-angle, quaternions), understand quaternion algebra, and derive the kinematic differential equation.",
      realMission: "All modern AOCS software uses quaternions internally. Euler angles are used only for display/visualisation."
    },
    equations: [
      {
        name: "Euler's rotation formula",
        eq: "R = (1−cos φ)êêᵀ + cos φ I + sin φ [ê×]",
        explain: "Any rotation = rotation by angle φ about axis ê (Euler's theorem). This gives the explicit rotation matrix from the axis-angle pair."
      },
      {
        name: "Quaternion definition",
        eq: "q = [ê sin(φ/2); cos(φ/2)] = [q⃗; q₄]",
        explain: "The symmetric Euler parameters. q⃗ = [q₁,q₂,q₃]ᵀ is the vector part, q₄ is the scalar part. Unit norm: |q| = 1."
      },
      {
        name: "Quaternion → Rotation matrix",
        eq: "A(q) = (q₄² − q⃗ᵀq⃗)I + 2q⃗q⃗ᵀ + 2q₄[q⃗×]",
        explain: "Convert quaternion to DCM. This is exact, no approximation. Used in QUEST to go from the optimal quaternion to the attitude matrix."
      },
      {
        name: "Quaternion multiplication",
        eq: "p⊗q = [p₄q⃗ + q₄p⃗ + p⃗×q⃗;  p₄q₄ − p⃗·q⃗]",
        explain: "Composition of two rotations. Non-commutative (p⊗q ≠ q⊗p) due to the cross product term. The quaternion group is homomorphic to SO(3) with a 2:1 mapping (±q give the same rotation)."
      },
      {
        name: "Quaternion inverse",
        eq: "q⁻¹ = q* = [−q⃗; q₄]",
        explain: "For unit quaternions, the inverse equals the conjugate. Represents the reverse rotation."
      },
      {
        name: "Kinematic equation",
        eq: "dq/dt = ½ Ω(ω) q",
        explain: "Ω(ω) is the 4×4 matrix: [[0,ωz,-ωy,ωx],[-ωz,0,ωx,ωy],[ωy,-ωx,0,ωz],[-ωx,-ωy,-ωz,0]]. If angular velocity ω is known (from gyros), the quaternion can be propagated without solving dynamics!"
      }
    ],
    derivation: `**Attitude Representations (p. 30 + Appendix A)**

**1) Euler Angles** (ψ, θ, φ)
• 3 angles describing sequential rotations about body axes
• Advantage: intuitive, easy to visualise
• DISADVANTAGE: geometric SINGULARITIES (gimbal lock) at θ = ±90°
• Require trig functions → slow computation

**2) Direction Cosine Matrix (DCM)** A
• 3×3 orthogonal matrix with 9 elements but only 3 DOF
• 6 constraints: AᵀA = I (6 independent equations)
• Advantage: direct transformation of vectors
• Disadvantage: 9 parameters for 3 DOF, constraint maintenance

**3) Axis-Angle** (ê, φ)
• Euler's theorem: any rotation = rotation by φ about axis ê
• Rotation matrix: R = (1−cos φ)êêᵀ + cos φ I + sin φ [ê×]
• Recover angle: cos φ = (tr(R) − 1)/2
• Ambiguity: (ê,φ) and (−ê,−φ) give the same rotation

**4) Quaternions (Symmetric Euler Parameters)** q = [q⃗; q₄]
• q₁ = e₁ sin(φ/2), q₂ = e₂ sin(φ/2), q₃ = e₃ sin(φ/2), q₄ = cos(φ/2)
• Unit norm: q₁²+q₂²+q₃²+q₄² = 1 → 4 params, 1 constraint → 3 DOF ✓
• NO singularities (unlike Euler angles)
• No trig functions in propagation
• Linear differential equations → fast numerical integration
• Non-commutative multiplication: p⊗q ≠ q⊗p

**Why quaternions WIN for AOCS:**
1. No geometric singularities (Euler angles fail at θ=±90°)
2. No trig function evaluation (saves computation)
3. Linear kinematic equation: dq/dt = ½ Ω(ω) q
4. Easy composition of rotations via quaternion multiplication
5. 2:1 mapping to SO(3): ±q → same rotation (minor ambiguity, easily handled)

**The kinematic equation (p. 162):**
When the spacecraft rotates with angular velocity ω, the quaternion evolves as:
q(t+Δt) = [cos(Δθ/2) + ω̂ sin(Δθ/2)] ⊗ q(t)

Taking the limit Δt→0:
dq/dt = ½ [0  ωz  -ωy  ωx; -ωz  0  ωx  ωy; ωy  -ωx  0  ωz; -ωx  -ωy  -ωz  0] q(t)

This is REMARKABLE: if you know ω (from gyros), you can propagate attitude without integrating the dynamical equations of motion!`,
    matlab: `% Quaternion Operations — Complete MATLAB Toolkit

% --- Quaternion multiplication ---
qmult = @(p,q) [p(4)*q(1:3) + q(4)*p(1:3) + cross(p(1:3),q(1:3));
                 p(4)*q(4) - dot(p(1:3),q(1:3))];

% --- Quaternion to DCM ---
q2dcm = @(q) (q(4)^2 - q(1:3)'*q(1:3))*eye(3) + 2*(q(1:3)*q(1:3)') + ...
             2*q(4)*[0 -q(3) q(2); q(3) 0 -q(1); -q(2) q(1) 0];

% --- Axis-angle to quaternion ---
aa2q = @(e,phi) [e*sin(phi/2); cos(phi/2)];

% --- Quaternion inverse (for unit quaternion) ---
qinv = @(q) [-q(1:3); q(4)];

% --- Omega matrix for kinematic equation ---
Omega = @(w) [0 w(3) -w(2) w(1); -w(3) 0 w(1) w(2); ...
              w(2) -w(1) 0 w(3); -w(1) -w(2) -w(3) 0];

% ─── DEMO 1: Quaternion composition ───
fprintf('=== Quaternion Operations Demo ===\\n\\n');

% Two rotations
q1 = aa2q([0;0;1], deg2rad(30));  % 30 deg about z
q2 = aa2q([1;0;0], deg2rad(45));  % 45 deg about x

% Compose rotations
q12 = qmult(q1, q2);
q21 = qmult(q2, q1);

fprintf('q1 (30° about z): [%.4f, %.4f, %.4f, %.4f]\\n', q1);
fprintf('q2 (45° about x): [%.4f, %.4f, %.4f, %.4f]\\n', q2);
fprintf('q1*q2:            [%.4f, %.4f, %.4f, %.4f]\\n', q12);
fprintf('q2*q1:            [%.4f, %.4f, %.4f, %.4f]\\n', q21);
fprintf('Non-commutative! q1*q2 ≠ q2*q1\\n\\n');

% Verify: q and -q give same DCM
A_pos = q2dcm(q1);
A_neg = q2dcm(-q1);
fprintf('DCM from +q1 and -q1: same? max diff = %.2e\\n\\n', max(abs(A_pos-A_neg),[],'all'));

% ─── DEMO 2: Kinematic propagation ───
fprintf('=== Kinematic Propagation ===\\n');
q0 = aa2q([0;0;1], 0); % start at identity
omega = [0; 0; deg2rad(1)]; % 1 deg/s about z-axis
dt = 0.1; % time step [s]
T = 90;   % total time [s] → expect 90° rotation

q = q0;
for t = 0:dt:T-dt
    dqdt = 0.5 * Omega(omega) * q;
    q = q + dqdt * dt; % simple Euler integration
    q = q / norm(q);   % re-normalise (critical!)
end

% Expected: 90 deg rotation about z → q = [0,0,sin(45°),cos(45°)]
fprintf('After %.0f s at 1 deg/s about z:\\n', T);
fprintf('Final q: [%.4f, %.4f, %.4f, %.4f]\\n', q);
fprintf('Expected: [0, 0, %.4f, %.4f]\\n', sin(pi/4), cos(pi/4));
fprintf('Rotation angle: %.1f deg\\n', 2*acosd(q(4)));`,
    examTraps: [
      "The professor asks: 'Why quaternions instead of Euler angles?' — Know all 3 reasons: no singularity, no trig functions, linear kinematic equation. Missing any one loses marks.",
      "The 2:1 homomorphism: q and −q represent the SAME rotation. This is NOT a problem in practice (just pick q₄ > 0 by convention) but the professor may test if you know about it.",
      "Quaternion multiplication is NOT commutative: p⊗q ≠ q⊗p. This is because of the cross product term p⃗×q⃗.",
      "Convention alert: in these notes (Iess/Sidi), the scalar part q₄ is LAST: q = [q⃗; q₄]. Some textbooks put it FIRST. The professor may ask which convention you're using.",
      "When propagating the kinematic equation numerically, you MUST re-normalise the quaternion at each step. Numerical errors accumulate and break the unit-norm constraint."
    ],
    drill: [
      { q: "Give 3 advantages of quaternions over Euler angles for attitude representation.", a: "1) No geometric singularities (Euler angles have gimbal lock at θ=±90°), 2) No trigonometric function evaluation needed, 3) Satisfy a LINEAR kinematic differential equation dq/dt = ½Ω(ω)q." },
      { q: "Write the quaternion kinematic equation and explain its significance.", a: "dq/dt = ½ Ω(ω) q, where Ω is the 4×4 matrix built from angular velocity ω. Significance: if ω is known (from gyros), attitude can be propagated by integrating this LINEAR ODE — no need to solve the full dynamical equations of motion." },
      { q: "Quaternion multiplication: is p⊗q = q⊗p? Why or why not?", a: "No, quaternion multiplication is NOT commutative. The formula is p⊗q = [p₄q⃗ + q₄p⃗ + p⃗×q⃗; p₄q₄ − p⃗·q⃗]. The cross product p⃗×q⃗ is antisymmetric (p⃗×q⃗ = −q⃗×p⃗), so p⊗q ≠ q⊗p. This reflects the non-commutativity of 3D rotations." }
    ]
  }
];

// ─── COMPARISON TABLE ───────────────────────────────────────────────────────
const COMPARISON = [
  { method: "TRIAD", type: "Deterministic / SFAD", inputs: "2 vector pairs (Wᵢ,Vᵢ)", output: "DCM A (3×3)", optimal: "No", nObs: "Exactly 2", pros: "Simple, fast, no iteration", cons: "Not optimal, asymmetric, sensitive to parallel vectors", keyEq: "A = [r₁ r₂ r₃][s₁ s₂ s₃]ᵀ" },
  { method: "QUEST", type: "Optimal / SFAD", inputs: "n vector pairs + weights", output: "Quaternion q (4×1)", optimal: "Yes", nObs: "≥ 2", pros: "Optimal, gives covariance, fast (eigenvalue)", cons: "Slightly more complex than TRIAD", keyEq: "Kq = λ_max q" },
  { method: "SVD", type: "Optimal / SFAD", inputs: "n vector pairs + weights (via B)", output: "DCM A (3×3)", optimal: "Yes", nObs: "≥ 2", pros: "Numerically robust, direct DCM", cons: "No direct quaternion output", keyEq: "A = U·diag(1,1,det(U)det(V))·Vᵀ" },
];

// ─── STYLES ─────────────────────────────────────────────────────────────────
const styles = {
  shell: { display: "flex", height: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 14, color: "var(--color-text-primary, #1a1a2e)", background: "var(--color-background-tertiary, #f0f0f5)" },
  sidebar: { width: 240, background: "var(--color-background-primary, #ffffff)", borderRight: "1px solid var(--color-border-tertiary, #e2e2e8)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" },
  sidebarHead: { padding: "14px 16px", borderBottom: "1px solid var(--color-border-tertiary, #e2e2e8)" },
  sidebarHeadT1: { fontSize: 10, color: "var(--color-text-tertiary, #8888a0)", fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase" },
  sidebarHeadT2: { fontSize: 14, fontWeight: 600, marginTop: 3 },
  sidebarHeadT3: { fontSize: 11, color: "var(--color-text-tertiary, #8888a0)", marginTop: 2 },
  sidebarList: { overflowY: "auto", flex: 1, padding: 6 },
  sItem: (active) => ({ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer", border: "none", background: active ? "var(--color-background-secondary, #eeeef5)" : "transparent", borderLeft: active ? "3px solid #4f8ef7" : "3px solid transparent", width: "100%", textAlign: "left", transition: "background 0.15s" }),
  sItemIcon: { fontSize: 15, flexShrink: 0, width: 20, textAlign: "center" },
  sItemTitle: { fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sItemPages: { fontSize: 10, color: "var(--color-text-tertiary, #8888a0)", fontFamily: "monospace" },
  main: { flex: 1, overflowY: "auto", padding: "24px 32px 48px" },
  sectionTitle: { fontSize: 22, fontWeight: 700, margin: 0 },
  sectionPages: { fontSize: 12, color: "var(--color-text-tertiary, #8888a0)", fontFamily: "monospace", marginTop: 4 },
  tabBar: { display: "flex", gap: 2, marginTop: 20, borderBottom: "2px solid var(--color-border-tertiary, #e2e2e8)", paddingBottom: 0 },
  tab: (active) => ({ padding: "8px 14px", cursor: "pointer", border: "none", background: "none", fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "#4f8ef7" : "var(--color-text-secondary, #555)", borderBottom: active ? "2px solid #4f8ef7" : "2px solid transparent", marginBottom: -2, transition: "all 0.15s" }),
  card: { background: "var(--color-background-primary, #fff)", border: "1px solid var(--color-border-tertiary, #e2e2e8)", borderRadius: 10, padding: "18px 20px", marginTop: 16 },
  eqBox: { background: "var(--color-background-secondary, #f5f5fa)", borderRadius: 8, padding: "12px 16px", margin: "10px 0", fontFamily: "monospace", fontSize: 13, overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.6 },
  codeBlock: { background: "#1e1e2e", color: "#cdd6f4", borderRadius: 8, padding: "14px 18px", margin: "10px 0", fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: 11.5, overflowX: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5 },
  trapBox: { background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: 8, padding: "10px 14px", margin: "8px 0", fontSize: 13 },
  drillQ: { background: "#e3f2fd", borderRadius: 8, padding: "10px 14px", margin: "8px 0", fontSize: 13, cursor: "pointer" },
  drillA: { background: "#e8f5e9", borderRadius: 8, padding: "10px 14px", margin: "4px 0 8px", fontSize: 13 },
  badge: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: color + "18", color: color, marginRight: 6 }),
  notationRow: { display: "grid", gridTemplateColumns: "100px 50px 1fr", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--color-border-tertiary, #e2e2e8)", fontSize: 13 },
  notationSym: { fontFamily: "monospace", fontWeight: 600, fontSize: 13 },
  overviewBox: { background: "linear-gradient(135deg, #667eea15, #764ba215)", border: "1px solid #667eea30", borderRadius: 10, padding: "16px 20px", marginTop: 12 },
};

const TABS = [
  { key: "overview", label: "📋 Overview" },
  { key: "equations", label: "📐 Equations" },
  { key: "derivation", label: "📝 Derivation" },
  { key: "matlab", label: "💻 MATLAB" },
  { key: "traps", label: "⚠️ Exam Traps" },
  { key: "drill", label: "🏋️ Drill" },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function App() {
  const [activeModule, setActiveModule] = useState("notation");
  const [activeTab, setActiveTab] = useState("overview");
  const [notationSearch, setNotationSearch] = useState("");
  const [drillRevealed, setDrillRevealed] = useState({});
  const [compSort, setCompSort] = useState(null);

  const toggleDrill = (modId, idx) => {
    const key = `${modId}-${idx}`;
    setDrillRevealed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredNotation = useMemo(() => {
    if (!notationSearch.trim()) return NOTATION_GROUPS;
    const q = notationSearch.toLowerCase();
    return NOTATION_GROUPS.map(g => ({
      ...g,
      rows: g.rows.filter(r =>
        r.sym.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q)
      )
    })).filter(g => g.rows.length > 0);
  }, [notationSearch]);

  const mod = MODULES.find(m => m.id === activeModule);

  return (
    <div style={styles.shell}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHead}>
          <div style={styles.sidebarHeadT1}>SMS • CHAPTER 2</div>
          <div style={styles.sidebarHeadT2}>Attitude Determination</div>
          <div style={styles.sidebarHeadT3}>Prof. Iess — Sapienza 2025-26</div>
        </div>
        <div style={styles.sidebarList}>
          <button style={styles.sItem(activeModule === "notation")} onClick={() => { setActiveModule("notation"); setActiveTab("overview"); }}>
            <span style={styles.sItemIcon}>📑</span>
            <div>
              <div style={styles.sItemTitle}>Master Notation Table</div>
              <div style={styles.sItemPages}>searchable</div>
            </div>
          </button>
          {MODULES.map(m => (
            <button key={m.id} style={styles.sItem(activeModule === m.id)} onClick={() => { setActiveModule(m.id); setActiveTab("overview"); }}>
              <span style={styles.sItemIcon}>{m.icon}</span>
              <div>
                <div style={styles.sItemTitle}>{m.num}. {m.title}</div>
                <div style={styles.sItemPages}>{m.pages}</div>
              </div>
            </button>
          ))}
          <button style={styles.sItem(activeModule === "comparison")} onClick={() => { setActiveModule("comparison"); setActiveTab("overview"); }}>
            <span style={styles.sItemIcon}>⚖️</span>
            <div>
              <div style={styles.sItemTitle}>Method Comparison</div>
              <div style={styles.sItemPages}>TRIAD vs QUEST vs SVD</div>
            </div>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={styles.main}>
        {/* ── NOTATION TABLE ── */}
        {activeModule === "notation" && (
          <div>
            <h1 style={styles.sectionTitle}>📑 Master Notation Table — Chapter 2</h1>
            <p style={{ ...styles.sectionPages, marginBottom: 12 }}>Every symbol used in Attitude Determination — Sidi + Class Notes</p>
            <input
              type="text"
              placeholder="🔍 Search symbols, names, descriptions..."
              value={notationSearch}
              onChange={e => setNotationSearch(e.target.value)}
              style={{ width: "100%", maxWidth: 400, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-tertiary, #ccc)", fontSize: 13, marginBottom: 16, background: "var(--color-background-primary, #fff)" }}
            />
            {filteredNotation.map((g, gi) => (
              <div key={gi} style={{ ...styles.card, marginTop: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                  <span>{g.emoji}</span> {g.title}
                  <span style={styles.badge(g.color)}>{g.rows.length} symbols</span>
                </div>
                {g.rows.map((r, ri) => (
                  <div key={ri} style={styles.notationRow}>
                    <div style={styles.notationSym}>{r.sym}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#888" }}>{r.dim}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{r.desc}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary, #666)", marginTop: 2 }}>{r.detail}</div>
                      {r.trap && <div style={{ fontSize: 11, color: "#e65100", marginTop: 3 }}>⚠️ {r.trap}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ── COMPARISON TABLE ── */}
        {activeModule === "comparison" && (
          <div>
            <h1 style={styles.sectionTitle}>⚖️ SFAD Method Comparison</h1>
            <p style={styles.sectionPages}>TRIAD vs QUEST vs SVD — at a glance</p>
            <div style={{ ...styles.card, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #ddd" }}>
                    {["Method", "Type", "# Obs", "Output", "Optimal?", "Key Equation", "Pros", "Cons"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600, fontSize: 11, color: "#666", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((c, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "10px", fontWeight: 600, color: "#4f8ef7" }}>{c.method}</td>
                      <td style={{ padding: "10px" }}>{c.type}</td>
                      <td style={{ padding: "10px" }}>{c.nObs}</td>
                      <td style={{ padding: "10px", fontFamily: "monospace", fontSize: 11 }}>{c.output}</td>
                      <td style={{ padding: "10px" }}>{c.optimal === "Yes" ? "✅ Yes" : "❌ No"}</td>
                      <td style={{ padding: "10px", fontFamily: "monospace", fontSize: 11 }}>{c.keyEq}</td>
                      <td style={{ padding: "10px", fontSize: 11, color: "#2e7d32" }}>{c.pros}</td>
                      <td style={{ padding: "10px", fontSize: 11, color: "#c62828" }}>{c.cons}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MODULE VIEW ── */}
        {mod && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{mod.icon}</span>
              <div>
                <h1 style={styles.sectionTitle}>Module {mod.num}: {mod.title}</h1>
                <div style={styles.sectionPages}>{mod.pages} — Class Notes (Iess, Sidi)</div>
              </div>
            </div>

            {/* Tab bar */}
            <div style={styles.tabBar}>
              {TABS.map(t => (
                <button key={t.key} style={styles.tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === "overview" && (
              <div style={styles.overviewBox}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#4f8ef7", marginBottom: 6 }}>🎯 Why this module?</div>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{mod.overview.why}</p>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#059669", marginTop: 14, marginBottom: 6 }}>📌 Learning Objective</div>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{mod.overview.objective}</p>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#d97706", marginTop: 14, marginBottom: 6 }}>🛰️ Real Mission Example</div>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{mod.overview.realMission}</p>
              </div>
            )}

            {/* Equations */}
            {activeTab === "equations" && (
              <div>
                {mod.equations.map((eq, i) => (
                  <div key={i} style={styles.card}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#4f8ef7", marginBottom: 6 }}>{eq.name}</div>
                    <div style={styles.eqBox}>{eq.eq}</div>
                    <p style={{ margin: "8px 0 0", lineHeight: 1.6, fontSize: 13, color: "var(--color-text-secondary, #555)" }}>{eq.explain}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Derivation */}
            {activeTab === "derivation" && (
              <div style={styles.card}>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 13 }}>{mod.derivation}</div>
              </div>
            )}

            {/* MATLAB */}
            {activeTab === "matlab" && (
              <div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 12, marginBottom: 4 }}>Copy and paste into MATLAB to run:</div>
                <div style={styles.codeBlock}>{mod.matlab}</div>
              </div>
            )}

            {/* Exam Traps */}
            {activeTab === "traps" && (
              <div>
                {mod.examTraps.map((trap, i) => (
                  <div key={i} style={styles.trapBox}>
                    <span style={{ fontWeight: 600 }}>⚠️ Trap #{i+1}:</span> {trap}
                  </div>
                ))}
              </div>
            )}

            {/* Drill */}
            {activeTab === "drill" && (
              <div>
                <p style={{ fontSize: 12, color: "#888", margin: "12px 0 8px" }}>Click each question to reveal the answer:</p>
                {mod.drill.map((d, i) => {
                  const key = `${mod.id}-${i}`;
                  return (
                    <div key={i}>
                      <div style={styles.drillQ} onClick={() => toggleDrill(mod.id, i)}>
                        <span style={{ fontWeight: 600 }}>Q{i+1}:</span> {d.q}
                        <span style={{ float: "right", fontSize: 11, color: "#1565c0" }}>{drillRevealed[key] ? "▲ Hide" : "▼ Reveal"}</span>
                      </div>
                      {drillRevealed[key] && (
                        <div style={styles.drillA}>
                          <span style={{ fontWeight: 600, color: "#2e7d32" }}>✅ Answer:</span> {d.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
