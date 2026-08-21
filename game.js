const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const starsEl = document.querySelector("#stars");
const controlsEl = document.querySelector("#controls");
const feedbackEl = document.querySelector("#feedback");
const missionTitleEl = document.querySelector("#mission-title");
const missionCopyEl = document.querySelector("#mission-copy");
const challengeCopyEl = document.querySelector("#challenge-copy");
const lawLabelEl = document.querySelector("#law-label");
const tabs = [...document.querySelectorAll(".mission-tab")];

const W = canvas.width;
const H = canvas.height;
const groundY = 405;

const missions = [
  {
    label: "Law 1: Inertia",
    title: "Coast through the timing gate",
    copy: "A moving object keeps moving at steady velocity when the resultant force is zero. Push briefly, then release and let the cart coast.",
    challenge: "Use short pushes to reach the green gate. Finish in the target speed band without over-thrusting.",
    success: "Great coast. Once the push stopped, net force returned to zero and the cart kept moving steadily.",
  },
  {
    label: "Law 2: F = ma",
    title: "Hit the supply platform",
    copy: "Acceleration equals force divided by mass. Bigger force launches harder; bigger mass makes the same force less effective.",
    challenge: "Tune force and mass, then launch the capsule so it lands on the platform.",
    success: "Clean landing. Your force and mass choice produced the right acceleration for the target range.",
  },
  {
    label: "Law 3: Action and reaction",
    title: "Balance the space skaters",
    copy: "For every action force there is an equal and opposite reaction force. Two objects push on each other and move apart.",
    challenge: "Choose a push strength so both skaters glide into their matching safe zones.",
    success: "Balanced push. The force pair was equal in size and opposite in direction.",
  },
];

const state = {
  law: 0,
  score: 0,
  stars: [0, 0, 0],
  bestScore: [0, 0, 0],
  messageTone: "info",
  first: {},
  second: {},
  third: {},
};

function resetFirst() {
  state.first = {
    cartX: 118,
    cartV: 0,
    forceTimer: 0,
    runTimer: 0,
    running: true,
    finished: false,
    finishSpeed: 0,
    pushes: 0,
    ghost: [],
  };
  setFeedback(missions[0].challenge, "info");
}

function resetSecond() {
  state.second = {
    force: 54,
    mass: 6,
    launched: false,
    landed: false,
    t: 0,
    x: 122,
    y: groundY - 38,
    vx: 0,
    vy: 0,
    landingX: null,
    trail: [],
  };
  setFeedback("Set the sliders. The live acceleration meter shows force / mass before launch.", "info");
}

function resetThird() {
  state.third = {
    strength: 52,
    thrown: false,
    settled: false,
    leftX: 440,
    rightX: 520,
    leftV: 0,
    rightV: 0,
    forceTimer: 0,
    trail: [],
  };
  setFeedback(missions[2].challenge, "info");
}

function setFeedback(text, tone = "info") {
  state.messageTone = tone;
  feedbackEl.textContent = text;
  feedbackEl.dataset.tone = tone;
}

function setLaw(nextLaw) {
  state.law = nextLaw;
  tabs.forEach((tab, index) => {
    tab.classList.toggle("active", index === nextLaw);
    tab.setAttribute("aria-selected", String(index === nextLaw));
  });
  lawLabelEl.textContent = missions[nextLaw].label;
  missionTitleEl.textContent = missions[nextLaw].title;
  missionCopyEl.textContent = missions[nextLaw].copy;
  challengeCopyEl.textContent = missions[nextLaw].challenge;
  if (nextLaw === 0 && !state.first.cartX) resetFirst();
  if (nextLaw === 1 && !state.second.x) resetSecond();
  if (nextLaw === 2 && !state.third.leftX) resetThird();
  setFeedback(missions[nextLaw].challenge, "info");
  renderControls();
}

function setMissionStars(index, stars, basePoints) {
  const previous = state.stars[index];
  if (stars <= previous) return;
  state.stars[index] = stars;
  state.score += (stars - previous) * basePoints;
  scoreEl.textContent = state.score;
  starsEl.textContent = `${state.stars.reduce((sum, item) => sum + item, 0)} / 9`;
}

function starText(stars) {
  return `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`;
}

function renderControls() {
  if (state.law === 0) {
    controlsEl.innerHTML = `
      <button class="action-btn" id="push-btn" title="Add a short forward force">Push</button>
      <button class="action-btn danger" id="brake-btn" title="Apply an opposite force">Brake</button>
      <button class="action-btn secondary" id="reset-btn" title="Restart this mission">Reset</button>
      <div class="mini-readout" id="first-readout">Target speed: 2.4-3.6 m/s</div>
    `;
    document.querySelector("#push-btn").addEventListener("click", pushFirst);
    document.querySelector("#brake-btn").addEventListener("click", brakeFirst);
    document.querySelector("#reset-btn").addEventListener("click", resetFirst);
  }

  if (state.law === 1) {
    controlsEl.innerHTML = `
      <div class="control-group">
        <label for="force">Force <strong id="force-value">${state.second.force}</strong> N</label>
        <input id="force" type="range" min="25" max="95" value="${state.second.force}">
      </div>
      <div class="control-group">
        <label for="mass">Mass <strong id="mass-value">${state.second.mass}</strong> kg</label>
        <input id="mass" type="range" min="2" max="12" value="${state.second.mass}">
      </div>
      <button class="action-btn" id="launch-btn" title="Launch the capsule">Launch</button>
      <button class="action-btn secondary" id="reset-btn" title="Reset the capsule">Reset</button>
      <div class="mini-readout" id="accel-readout"></div>
    `;
    const forceInput = document.querySelector("#force");
    const massInput = document.querySelector("#mass");
    forceInput.addEventListener("input", (event) => {
      state.second.force = Number(event.target.value);
      document.querySelector("#force-value").textContent = state.second.force;
      updateAccelerationReadout();
    });
    massInput.addEventListener("input", (event) => {
      state.second.mass = Number(event.target.value);
      document.querySelector("#mass-value").textContent = state.second.mass;
      updateAccelerationReadout();
    });
    document.querySelector("#launch-btn").addEventListener("click", launchSecond);
    document.querySelector("#reset-btn").addEventListener("click", resetSecond);
    updateAccelerationReadout();
  }

  if (state.law === 2) {
    controlsEl.innerHTML = `
      <div class="control-group">
        <label for="strength">Push strength <strong id="strength-value">${state.third.strength}</strong>%</label>
        <input id="strength" type="range" min="20" max="95" value="${state.third.strength}">
      </div>
      <button class="action-btn" id="throw-btn" title="Make the skaters push apart">Push apart</button>
      <button class="action-btn secondary" id="reset-btn" title="Reset skaters">Reset</button>
      <div class="mini-readout">Both arrows always match in size.</div>
    `;
    document.querySelector("#strength").addEventListener("input", (event) => {
      state.third.strength = Number(event.target.value);
      document.querySelector("#strength-value").textContent = state.third.strength;
    });
    document.querySelector("#throw-btn").addEventListener("click", throwThird);
    document.querySelector("#reset-btn").addEventListener("click", resetThird);
  }
}

function updateAccelerationReadout() {
  const node = document.querySelector("#accel-readout");
  if (!node) return;
  node.textContent = `Acceleration: ${(state.second.force / state.second.mass).toFixed(1)} m/s²`;
}

function pushFirst() {
  if (state.first.finished) return;
  state.first.forceTimer = 18;
  state.first.cartV += 0.58;
  state.first.pushes += 1;
  setFeedback("Forward force on: velocity increases. Release it and the cart coasts.", "info");
}

function brakeFirst() {
  if (state.first.finished) return;
  state.first.forceTimer = -16;
  state.first.cartV = Math.max(0, state.first.cartV - 0.7);
  setFeedback("Opposite force on: velocity decreases because the resultant force points backward.", "warn");
}

function launchSecond() {
  if (state.second.launched) return;
  const acceleration = state.second.force / state.second.mass;
  state.second.launched = true;
  state.second.landed = false;
  state.second.t = 0;
  state.second.x = 122;
  state.second.y = groundY - 42;
  state.second.vx = acceleration * 0.92;
  state.second.vy = -11.8;
  state.second.trail = [];
  state.second.landingX = null;
  setFeedback(`Launch acceleration is ${acceleration.toFixed(1)} m/s². Watch the range change from F / m.`, "info");
}

function throwThird() {
  if (state.third.thrown) return;
  const speed = state.third.strength / 17;
  state.third.thrown = true;
  state.third.settled = false;
  state.third.leftV = -speed;
  state.third.rightV = speed;
  state.third.forceTimer = 46;
  state.third.trail = [];
  setFeedback("Equal opposite forces act at the same time. The skaters now glide apart.", "info");
}

function drawRoundedRect(x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawSceneBase(title, subtitle) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#dff0ff");
  sky.addColorStop(0.52, "#f8fbff");
  sky.addColorStop(1, "#eef4ea");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillRect(0, 0, W, 132);
  ctx.fillStyle = "#18212f";
  ctx.font = "900 30px system-ui";
  ctx.fillText(title, 48, 60);
  ctx.fillStyle = "#52617a";
  ctx.font = "700 17px system-ui";
  ctx.fillText(subtitle, 50, 92);
}

function drawTrack() {
  drawRoundedRect(56, groundY, 848, 24, 12, "#c9d9e9");
  ctx.fillStyle = "#7f97b1";
  for (let x = 76; x < 890; x += 54) {
    ctx.fillRect(x, groundY + 26, 26, 7);
  }
}

function drawVector(x, y, length, color, label, below = false) {
  const dir = Math.sign(length) || 1;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + length, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + length, y);
  ctx.lineTo(x + length - dir * 18, y - 12);
  ctx.lineTo(x + length - dir * 18, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.font = "900 15px system-ui";
  ctx.fillText(label, x + (length < 0 ? length - 8 : 0), y + (below ? 28 : -16));
  ctx.restore();
}

function drawMeter(x, y, label, value, min, max, color) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  ctx.fillStyle = "#ffffff";
  drawRoundedRect(x, y, 218, 58, 8, "#ffffff", "#d5e0ee");
  ctx.fillStyle = "#52617a";
  ctx.font = "800 14px system-ui";
  ctx.fillText(label, x + 14, y + 22);
  ctx.fillStyle = "#e7edf5";
  drawRoundedRect(x + 14, y + 34, 190, 10, 5, "#e7edf5");
  drawRoundedRect(x + 14, y + 34, 190 * pct, 10, 5, color);
}

function awardFirst() {
  const speed = state.first.finishSpeed;
  const accuracy = Math.abs(speed - 3);
  const pushPenalty = Math.max(0, state.first.pushes - 4) * 0.3;
  const score = Math.max(0, 1.4 - accuracy - pushPenalty);
  const stars = score > 1.0 ? 3 : score > 0.55 ? 2 : 1;
  setMissionStars(0, stars, 100);
  setFeedback(`${missions[0].success} Result: ${starText(stars)} at ${speed.toFixed(1)} m/s.`, "success");
}

function updateFirst() {
  const s = state.first;
  if (!s.running || s.finished) return;
  s.runTimer += 1;
  if (s.forceTimer > 0) {
    s.cartV += 0.025;
    s.forceTimer -= 1;
  } else if (s.forceTimer < 0) {
    s.cartV = Math.max(0, s.cartV - 0.028);
    s.forceTimer += 1;
  }
  s.cartV = Math.min(5.4, s.cartV);
  s.cartX += s.cartV;
  if (s.runTimer % 10 === 0) {
    s.ghost.push({ x: s.cartX, v: s.cartV });
    if (s.ghost.length > 18) s.ghost.shift();
  }
  if (s.cartX >= 742) {
    s.finished = true;
    s.finishSpeed = s.cartV;
    awardFirst();
  }
}

function drawCart(x, y, color) {
  drawRoundedRect(x - 56, y - 48, 112, 42, 14, color);
  ctx.fillStyle = "#334155";
  drawRoundedRect(x - 24, y - 78, 48, 32, 8, "#f3b536");
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(x - 32, y - 2, 13, 0, Math.PI * 2);
  ctx.arc(x + 34, y - 2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#dbeafe";
  ctx.beginPath();
  ctx.arc(x - 32, y - 2, 5, 0, Math.PI * 2);
  ctx.arc(x + 34, y - 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawFirst() {
  const s = state.first;
  drawSceneBase("Mission 1: Inertia Dash", "Push briefly. When net force is zero, velocity stays steady.");
  drawTrack();

  drawRoundedRect(684, groundY - 92, 150, 92, 8, "rgba(33,133,95,0.16)", "#21855f");
  ctx.fillStyle = "#21855f";
  ctx.font = "900 18px system-ui";
  ctx.fillText("FINISH GATE", 704, groundY - 58);
  ctx.font = "800 14px system-ui";
  ctx.fillText("2.4-3.6 m/s", 718, groundY - 32);

  s.ghost.forEach((item, index) => {
    ctx.globalAlpha = 0.08 + index * 0.018;
    drawCart(item.x, groundY, "#2364aa");
  });
  ctx.globalAlpha = 1;
  drawCart(s.cartX, groundY, "#2364aa");

  if (s.forceTimer > 0) drawVector(s.cartX - 88, groundY - 72, 74, "#c73e45", "push force");
  if (s.forceTimer < 0) drawVector(s.cartX + 88, groundY - 72, -74, "#c73e45", "brake force");
  if (s.forceTimer === 0 && s.cartV > 0.15) drawVector(s.cartX - 54, groundY - 104, 108, "#21855f", "net force = 0", true);

  drawMeter(48, 154, "Velocity", s.cartV, 0, 5.4, "#2364aa");
  drawMeter(286, 154, "Pushes used", s.pushes, 0, 8, "#f3b536");
  ctx.fillStyle = "#52617a";
  ctx.font = "800 16px system-ui";
  ctx.fillText("Ghost carts mark equal time gaps. Even gaps mean steady motion.", 48, 244);
}

function scoreLanding(x) {
  const center = 704;
  const miss = Math.abs(x - center);
  if (miss <= 22) return 3;
  if (miss <= 48) return 2;
  if (miss <= 84) return 1;
  return 0;
}

function updateSecond() {
  const s = state.second;
  if (!s.launched || s.landed) return;
  s.t += 1;
  s.vy += 0.33;
  s.x += s.vx;
  s.y += s.vy;
  if (s.t % 3 === 0) s.trail.push({ x: s.x, y: s.y });
  if (s.y >= groundY - 42) {
    s.y = groundY - 42;
    s.launched = false;
    s.landed = true;
    s.landingX = s.x;
    const stars = scoreLanding(s.x);
    if (stars > 0) {
      setMissionStars(1, stars, 100);
      setFeedback(`${missions[1].success} Result: ${starText(stars)}. Landing error ${Math.abs(s.x - 704).toFixed(0)} m.`, "success");
    } else if (s.x < 620) {
      setFeedback("Short landing. Increase force or reduce mass so acceleration is larger.", "warn");
    } else {
      setFeedback("Overshot. Reduce force or increase mass so acceleration is smaller.", "warn");
    }
  }
}

function drawCapsule(x, y) {
  drawRoundedRect(x - 34, y - 22, 68, 44, 20, "#2364aa");
  ctx.fillStyle = "#f3b536";
  ctx.beginPath();
  ctx.arc(x + 16, y - 2, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawSecond() {
  const s = state.second;
  const acceleration = s.force / s.mass;
  drawSceneBase("Mission 2: F = ma Launcher", "Tune force and mass. The launch speed comes from acceleration.");
  drawTrack();

  drawRoundedRect(650, groundY - 80, 108, 80, 8, "rgba(33,133,95,0.16)", "#21855f");
  ctx.fillStyle = "#21855f";
  ctx.font = "900 18px system-ui";
  ctx.fillText("PLATFORM", 660, groundY - 44);
  ctx.fillStyle = "rgba(35,100,170,0.14)";
  ctx.fillRect(682, groundY - 88, 44, 88);

  s.trail.forEach((point, index) => {
    ctx.globalAlpha = 0.16 + index / Math.max(28, s.trail.length) * 0.42;
    ctx.fillStyle = "#2364aa";
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  drawCapsule(s.x, s.y);

  drawVector(68, 176, s.force * 2.15, "#c73e45", "force");
  drawVector(68, 240, acceleration * 20, "#21855f", "acceleration");
  drawMeter(48, 304, "Mass resists acceleration", s.mass, 2, 12, "#f3b536");
  drawMeter(286, 304, "Acceleration = F / m", acceleration, 2, 34, "#21855f");

  if (s.landingX) {
    ctx.strokeStyle = "#c73e45";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(s.landingX, groundY - 72);
    ctx.lineTo(s.landingX, groundY + 16);
    ctx.stroke();
  }
}

function scoreThird(leftX, rightX) {
  const leftMiss = Math.abs(leftX - 242);
  const rightMiss = Math.abs(rightX - 718);
  const miss = Math.max(leftMiss, rightMiss);
  if (miss <= 18) return 3;
  if (miss <= 42) return 2;
  if (miss <= 78) return 1;
  return 0;
}

function updateThird() {
  const s = state.third;
  if (!s.thrown || s.settled) return;
  s.leftX += s.leftV;
  s.rightX += s.rightV;
  s.leftV *= 0.982;
  s.rightV *= 0.982;
  s.forceTimer = Math.max(0, s.forceTimer - 1);
  if (s.trail.length === 0 || Math.abs(s.leftX - s.trail[s.trail.length - 1].leftX) > 14) {
    s.trail.push({ leftX: s.leftX, rightX: s.rightX });
    if (s.trail.length > 18) s.trail.shift();
  }
  if (Math.abs(s.leftV) < 0.08 && Math.abs(s.rightV) < 0.08) {
    s.settled = true;
    const stars = scoreThird(s.leftX, s.rightX);
    if (stars > 0) {
      setMissionStars(2, stars, 100);
      setFeedback(`${missions[2].success} Result: ${starText(stars)}. Both skaters moved equal distances in opposite directions.`, "success");
    } else {
      setFeedback("They missed the safe zones. Adjust push strength, then compare how both skaters move apart symmetrically.", "warn");
    }
  }
}

function drawSkater(x, y, color, facing) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 58, 16, 0, Math.PI * 2);
  ctx.fill();
  drawRoundedRect(x - 18, y - 44, 36, 48, 12, color);
  ctx.strokeStyle = "#18212f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 26 * facing, y - 20);
  ctx.lineTo(x - 52 * facing, y - 28);
  ctx.moveTo(x + 26 * facing, y - 16);
  ctx.lineTo(x + 48 * facing, y - 2);
  ctx.stroke();
  ctx.fillStyle = "#18212f";
  ctx.fillRect(x - 28, y + 8, 56, 6);
}

function drawThird() {
  const s = state.third;
  drawSceneBase("Mission 3: Space Skater Push", "A push is never lonely: forces arrive as equal opposite pairs.");
  drawRoundedRect(64, 220, 832, 188, 8, "#dceaf7", "#c3d5e8");

  drawRoundedRect(184, 262, 116, 86, 8, "rgba(33,133,95,0.15)", "#21855f");
  drawRoundedRect(660, 262, 116, 86, 8, "rgba(33,133,95,0.15)", "#21855f");
  ctx.fillStyle = "#21855f";
  ctx.font = "900 15px system-ui";
  ctx.fillText("LEFT SAFE", 204, 310);
  ctx.fillText("RIGHT SAFE", 676, 310);

  s.trail.forEach((point, index) => {
    ctx.globalAlpha = 0.08 + index * 0.018;
    drawSkater(point.leftX, 358, "#2364aa", -1);
    drawSkater(point.rightX, 358, "#c73e45", 1);
  });
  ctx.globalAlpha = 1;
  drawSkater(s.leftX, 358, "#2364aa", -1);
  drawSkater(s.rightX, 358, "#c73e45", 1);

  if (s.forceTimer > 0) {
    const length = 54 + s.strength * 0.8;
    drawVector(480, 168, -length, "#2364aa", "force on blue");
    drawVector(480, 130, length, "#c73e45", "force on red");
  }

  drawMeter(48, 142, "Push strength", s.strength, 20, 95, "#2364aa");
  ctx.fillStyle = "#52617a";
  ctx.font = "800 16px system-ui";
  ctx.fillText("Same-sized arrows, opposite directions. Same mass means equal speed changes.", 300, 176);
}

function tick() {
  if (state.law === 0) {
    updateFirst();
    drawFirst();
  }
  if (state.law === 1) {
    updateSecond();
    drawSecond();
  }
  if (state.law === 2) {
    updateThird();
    drawThird();
  }
  requestAnimationFrame(tick);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setLaw(Number(tab.dataset.law)));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "1") setLaw(0);
  if (event.key === "2") setLaw(1);
  if (event.key === "3") setLaw(2);
  if (event.code === "Space" && state.law === 0) {
    event.preventDefault();
    pushFirst();
  }
});

resetFirst();
resetSecond();
resetThird();
setLaw(0);
tick();
