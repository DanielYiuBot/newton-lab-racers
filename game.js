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

const missions = [
  {
    label: "Law 1: Inertia",
    title: "Keep the rover cruising",
    copy: "Newton's First Law says an object stays still or keeps moving at the same speed in a straight line unless a resultant force acts on it.",
    challenge: "Use short force bursts to clear obstacles, then let inertia carry the rover.",
    success: "Nice control. You changed motion only when a new force was needed, then inertia kept the rover moving.",
  },
  {
    label: "Law 2: F = ma",
    title: "Tune the test launch",
    copy: "Newton's Second Law says acceleration depends on force and mass. More force means more acceleration; more mass means less acceleration.",
    challenge: "Choose force and mass so the probe lands in the green target zone.",
    success: "Bullseye. The same equation explains why that force and mass created the launch acceleration.",
  },
  {
    label: "Law 3: Action and reaction",
    title: "Dock the rescue pod",
    copy: "Newton's Third Law says forces come in equal and opposite pairs. Push one way and the other object pushes back.",
    challenge: "Fire the pod thruster and dock gently in the target gate.",
    success: "Docked. The exhaust pushed backward, so the pod was pushed forward by an equal opposite force.",
  },
];

const state = {
  law: 0,
  score: 0,
  stars: [0, 0, 0],
  time: 0,
  rover: { x: 110, y: 368, vx: 1.45, burst: 0 },
  obstacle: { x: 560, y: 368, active: true },
  second: { force: 48, mass: 6, launched: false, x: 120, y: 380, vx: 0, maxX: 120 },
  third: { fired: false, podX: 124, exhaustX: 100, vx: 0, docked: false },
};

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
  feedbackEl.textContent = missions[nextLaw].challenge;
  renderControls();
}

function addScore(points, starIndex) {
  state.score += points;
  state.stars[starIndex] = Math.min(3, state.stars[starIndex] + 1);
  scoreEl.textContent = state.score;
  starsEl.textContent = `${state.stars.reduce((sum, item) => sum + item, 0)} / 9`;
}

function renderControls() {
  if (state.law === 0) {
    controlsEl.innerHTML = `
      <button class="action-btn" id="burst-btn">Apply forward force</button>
      <button class="action-btn secondary" id="reset-btn">Reset run</button>
    `;
    document.querySelector("#burst-btn").addEventListener("click", () => {
      state.rover.burst = 30;
      feedbackEl.textContent = "A force is acting now, so velocity changes. When it ends, the rover keeps moving.";
    });
    document.querySelector("#reset-btn").addEventListener("click", resetFirst);
  }

  if (state.law === 1) {
    controlsEl.innerHTML = `
      <div class="control-group">
        <label for="force">Force: <span id="force-value">${state.second.force}</span> N</label>
        <input id="force" type="range" min="20" max="90" value="${state.second.force}">
      </div>
      <div class="control-group">
        <label for="mass">Mass: <span id="mass-value">${state.second.mass}</span> kg</label>
        <input id="mass" type="range" min="2" max="12" value="${state.second.mass}">
      </div>
      <button class="action-btn" id="launch-btn">Launch</button>
      <button class="action-btn secondary" id="reset-btn">Reset</button>
    `;
    document.querySelector("#force").addEventListener("input", (event) => {
      state.second.force = Number(event.target.value);
      document.querySelector("#force-value").textContent = state.second.force;
    });
    document.querySelector("#mass").addEventListener("input", (event) => {
      state.second.mass = Number(event.target.value);
      document.querySelector("#mass-value").textContent = state.second.mass;
    });
    document.querySelector("#launch-btn").addEventListener("click", launchSecond);
    document.querySelector("#reset-btn").addEventListener("click", resetSecond);
  }

  if (state.law === 2) {
    controlsEl.innerHTML = `
      <button class="action-btn" id="fire-btn">Fire thruster</button>
      <button class="action-btn secondary" id="reset-btn">Reset dock</button>
    `;
    document.querySelector("#fire-btn").addEventListener("click", () => {
      state.third.fired = true;
      state.third.vx += 3.4;
      feedbackEl.textContent = "The pod pushes exhaust backward. The exhaust pushes the pod forward with an equal opposite force.";
    });
    document.querySelector("#reset-btn").addEventListener("click", resetThird);
  }
}

function resetFirst() {
  state.rover = { x: 110, y: 368, vx: 1.45, burst: 0 };
  state.obstacle.active = true;
  feedbackEl.textContent = missions[0].challenge;
}

function resetSecond() {
  state.second.launched = false;
  state.second.x = 120;
  state.second.y = 380;
  state.second.vx = 0;
  state.second.maxX = 120;
  feedbackEl.textContent = "Adjust force and mass, then launch. Watch how acceleration changes.";
}

function resetThird() {
  state.third = { fired: false, podX: 124, exhaustX: 100, vx: 0, docked: false };
  feedbackEl.textContent = missions[2].challenge;
}

function launchSecond() {
  const acceleration = state.second.force / state.second.mass;
  state.second.vx = acceleration * 0.82;
  state.second.launched = true;
  state.second.x = 120;
  state.second.maxX = 120;
  feedbackEl.textContent = `Acceleration = force / mass = ${acceleration.toFixed(1)} m/s². Track the probe's distance.`;
}

function drawTrack() {
  ctx.fillStyle = "#dbe7f2";
  ctx.fillRect(70, 410, 820, 18);
  ctx.fillStyle = "#8aa2bd";
  for (let x = 82; x < 880; x += 60) {
    ctx.fillRect(x, 428, 26, 8);
  }
}

function drawArrow(x, y, length, color, label) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + length, y);
  ctx.stroke();
  const dir = Math.sign(length) || 1;
  ctx.beginPath();
  ctx.moveTo(x + length, y);
  ctx.lineTo(x + length - dir * 16, y - 11);
  ctx.lineTo(x + length - dir * 16, y + 11);
  ctx.closePath();
  ctx.fill();
  ctx.font = "700 18px system-ui";
  ctx.fillText(label, x + Math.min(length, 0) - 8, y - 18);
}

function drawSceneBase(title) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#eef5fb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(42, 36, 876, 88);
  ctx.fillStyle = "#18212f";
  ctx.font = "900 32px system-ui";
  ctx.fillText(title, 70, 88);
}

function updateFirst() {
  const rover = state.rover;
  if (rover.burst > 0) {
    rover.vx += 0.08;
    rover.burst -= 1;
  }
  rover.x += rover.vx;
  if (state.obstacle.active && Math.abs(rover.x - state.obstacle.x) < 48 && rover.vx > 2.25) {
    state.obstacle.active = false;
    addScore(100, 0);
    feedbackEl.textContent = missions[0].success;
  }
  if (rover.x > 900) {
    rover.x = 90;
    rover.vx = 1.45;
    state.obstacle.active = true;
  }
}

function drawFirst() {
  drawSceneBase("First Law: inertia keeps motion steady");
  drawTrack();
  ctx.fillStyle = "#c73e45";
  if (state.obstacle.active) {
    ctx.fillRect(state.obstacle.x - 18, state.obstacle.y - 44, 36, 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 20px system-ui";
    ctx.fillText("!", state.obstacle.x - 5, state.obstacle.y - 15);
  }
  const rover = state.rover;
  ctx.fillStyle = "#21855f";
  ctx.fillRect(rover.x - 46, rover.y - 36, 92, 36);
  ctx.fillStyle = "#18212f";
  ctx.beginPath();
  ctx.arc(rover.x - 25, rover.y + 3, 13, 0, Math.PI * 2);
  ctx.arc(rover.x + 28, rover.y + 3, 13, 0, Math.PI * 2);
  ctx.fill();
  if (rover.burst > 0) {
    drawArrow(rover.x - 82, rover.y - 20, 64, "#2364aa", "force");
  }
  ctx.fillStyle = "#5d6b7f";
  ctx.font = "700 19px system-ui";
  ctx.fillText(`Velocity: ${rover.vx.toFixed(1)} m/s`, 70, 160);
}

function updateSecond() {
  if (!state.second.launched) return;
  state.second.x += state.second.vx;
  state.second.vx *= 0.988;
  state.second.maxX = Math.max(state.second.maxX, state.second.x);
  if (state.second.vx < 0.15) {
    const inTarget = state.second.maxX > 626 && state.second.maxX < 720;
    if (inTarget) {
      addScore(120, 1);
      feedbackEl.textContent = missions[1].success;
    } else {
      feedbackEl.textContent = "Try again. Increase force for more acceleration, or lower mass so the same force has a bigger effect.";
    }
    state.second.launched = false;
  }
}

function drawSecond() {
  drawSceneBase("Second Law: acceleration = force / mass");
  drawTrack();
  ctx.fillStyle = "#cfeadf";
  ctx.fillRect(626, 346, 94, 64);
  ctx.fillStyle = "#21855f";
  ctx.font = "900 18px system-ui";
  ctx.fillText("TARGET", 638, 384);
  const s = state.second;
  ctx.fillStyle = "#2364aa";
  ctx.beginPath();
  ctx.roundRect(s.x - 34, s.y - 34, 68, 34, 8);
  ctx.fill();
  drawArrow(112, 184, state.second.force * 2, "#c73e45", "force");
  drawArrow(112, 242, (state.second.force / state.second.mass) * 18, "#21855f", "acceleration");
  ctx.fillStyle = "#5d6b7f";
  ctx.font = "700 19px system-ui";
  ctx.fillText(`Mass: ${state.second.mass} kg`, 70, 160);
}

function updateThird() {
  const pod = state.third;
  if (!pod.fired || pod.docked) return;
  pod.podX += pod.vx;
  pod.exhaustX -= 2.8;
  pod.vx *= 0.985;
  if (pod.podX > 690 && pod.podX < 746 && pod.vx < 2.8) {
    pod.docked = true;
    pod.vx = 0;
    addScore(120, 2);
    feedbackEl.textContent = missions[2].success;
  }
  if (pod.podX > 860) {
    feedbackEl.textContent = "Too fast. Reset and use one careful thruster push to dock gently.";
    pod.vx = 0;
  }
}

function drawThird() {
  drawSceneBase("Third Law: forces happen in pairs");
  ctx.fillStyle = "#dbe7f2";
  ctx.fillRect(70, 260, 820, 120);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(730, 280, 72, 80);
  ctx.strokeStyle = "#21855f";
  ctx.lineWidth = 6;
  ctx.strokeRect(730, 280, 72, 80);
  ctx.fillStyle = "#21855f";
  ctx.font = "900 18px system-ui";
  ctx.fillText("DOCK", 742, 326);
  const pod = state.third;
  ctx.fillStyle = "#2364aa";
  ctx.beginPath();
  ctx.roundRect(pod.podX - 42, 303, 84, 42, 12);
  ctx.fill();
  ctx.fillStyle = "#f3b536";
  ctx.beginPath();
  ctx.arc(pod.exhaustX, 324, 14, 0, Math.PI * 2);
  ctx.fill();
  if (pod.fired) {
    drawArrow(pod.podX - 64, 238, -92, "#c73e45", "exhaust push");
    drawArrow(pod.podX + 30, 210, 92, "#21855f", "pod push");
  }
}

function loop() {
  state.time += 1;
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
  requestAnimationFrame(loop);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setLaw(Number(tab.dataset.law)));
});

setLaw(0);
loop();
