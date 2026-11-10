import { Game } from "./engine.js";
import { sounds } from "./audio.js";
import { WORLDS } from "./renderer.js";
import { QUESTIONS } from "../data/questions.js";
import { readProgress, saveProgress } from "./storage.js";

const $ = (id) => document.getElementById(id);
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const number = (n) => Math.floor(n).toString().padStart(5, "0");
const progress = readProgress();
const subjects = new Set(["Maths", "Science"]);
let usedQuestions = new Set(),
  currentQuestion = null,
  toastTimer,
  dialogPaused = false,
  storageAvailable = true;
const game = new Game($("gameCanvas"), {
  change: refresh,
  frame: refreshCounters,
  pause: showPause,
  quiz: showQuiz,
  over: showGameOver,
  toast,
});
sounds.enabled = !progress.muted;
updateSound();
refresh();

function refreshCounters() {
  $("score").textContent = number(game.score);
  $("highScore").textContent = number(Math.max(progress.highScore, game.score));
  const powers = [];
  if (game.shield) powers.push("◇ Quiz hint ready");
  if (game.doubleTime > 0)
    powers.push(`2× Points · ${Math.ceil(game.doubleTime)}s`);
  $("activePower").hidden = powers.length === 0;
  if (powers.length) $("activePower").textContent = powers.join("  ·  ");
}
function refresh() {
  refreshCounters();
  $("lives").innerHTML = Array.from(
    { length: 3 },
    (_, i) => `<span class="${i < game.lives ? "" : "lost"}">♥</span>`,
  ).join(" ");
  $("lives").setAttribute(
    "aria-label",
    `${game.lives} ${game.lives === 1 ? "life" : "lives"} remaining`,
  );
  $("level").textContent = String(game.level).padStart(2, "0");
  const world = WORLDS[Math.min(game.level - 1, 3)];
  $("biome").textContent = world.name;
  $("worldLabel").textContent =
    `WORLD ${String(Math.min(game.level, 4)).padStart(2, "0")} · ${world.name.toUpperCase()}`;
  const worldsUnlocked = Math.min(game.level, WORLDS.length);
  $("progressFill").style.width = `${(worldsUnlocked / WORLDS.length) * 100}%`;
  $("progressTrack").setAttribute("aria-valuenow", worldsUnlocked);
  $("progressCount").textContent = `${worldsUnlocked} / ${WORLDS.length}`;
  $("progressLabel").textContent =
    game.state === "quiz"
      ? "Save your life with the right answer"
      : `Next discovery: level ${game.level + 1}`;
  $("progressDescription").textContent =
    "Hurdle hit → question. Correct: keep your life. Wrong: lose one.";
  $("startScreen").hidden = game.state !== "ready";
  $("pauseButton").disabled = !["running", "paused"].includes(game.state);
  $("pauseButton").setAttribute(
    "aria-label",
    game.state === "paused" ? "Resume game" : "Pause game",
  );
  $("pauseButton").textContent = game.state === "paused" ? "▷" : "Ⅱ";
  if (["running", "ready"].includes(game.state)) $("gameOverlay").hidden = true;
  document
    .querySelectorAll("[data-subject]")
    .forEach((b) => (b.disabled = !["ready", "over"].includes(game.state)));
  $("subjectNote").textContent = ["ready", "over"].includes(game.state)
    ? subjects.size === 2
      ? "Maths & Science. Learn with every hurdle."
      : `${subjects.size} subject${subjects.size === 1 ? "" : "s"} selected for your next adventure.`
    : "Your subject mix is set for this adventure.";
}
function start() {
  usedQuestions = new Set();
  currentQuestion = null;
  game.start();
  $("gameToast").classList.remove("visible");
  clearTimeout(toastTimer);
}
function toast(message) {
  $("gameToast").textContent = message;
  $("gameToast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => $("gameToast").classList.remove("visible"),
    2600,
  );
}
function overlay(html, focusSelector = "button") {
  $("overlayCard").innerHTML = html;
  $("gameOverlay").hidden = false;
  $("overlayCard").querySelector(focusSelector)?.focus({ preventScroll: true });
}
function showPause() {
  refresh();
  overlay(
    `<p class="overlay-eyebrow">TAKE A LITTLE BREATHER</p><h2>Even explorers need a pause.</h2><p>Your adventure will be right here.<br>Ready whenever you are.</p><div class="overlay-actions"><button class="primary-button" id="resumeButton">${icon("play")}Keep exploring</button><button class="secondary-button" id="restartButton">Start over</button></div>`,
  );
  $("resumeButton").onclick = () => game.resume();
  $("restartButton").onclick = start;
}
function nextQuestion() {
  const difficulty = Math.min(3, Math.ceil(game.level / 2));
  let pool = QUESTIONS.filter(
    (q) => subjects.has(q.subject) && q.difficulty === difficulty,
  );
  let remaining = pool.filter((q) => !usedQuestions.has(q.id));
  if (!remaining.length) {
    for (const q of pool) usedQuestions.delete(q.id);
    remaining = pool;
  }
  // Balance subjects while keeping the chosen questions unpredictable.
  const subjectOrder = [...subjects];
  const subject = subjectOrder[game.questions % subjectOrder.length];
  const balanced = remaining.filter((q) => q.subject === subject);
  if (balanced.length) remaining = balanced;
  const q = remaining[Math.floor(Math.random() * remaining.length)];
  usedQuestions.add(q.id);
  const shuffled = q.options.map((text, i) => ({
    text,
    correct: i === q.answer,
  }));
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { ...q, choices: shuffled };
}
function showQuiz() {
  currentQuestion = nextQuestion();
  refresh();
  const q = currentQuestion;
  overlay(
    `<div class="quiz-meta"><span>✦ ${q.subject.toUpperCase()} · SAVE YOUR LIFE</span><span>LEVEL ${game.level} · +${100 * game.level} POINTS</span></div><h2 class="quiz-title" id="quizQuestion"></h2><div class="answers" id="answers"></div><p class="quiz-feedback" id="quizFeedback" role="status">Correct answer: keep your life. Wrong answer: lose one life.</p><button id="continueButton" class="primary-button" hidden>Keep exploring ${icon("arrow")}</button>`,
    "#quizQuestion",
  );
  $("quizQuestion").textContent = q.question;
  $("quizQuestion").tabIndex = -1;
  $("quizQuestion").focus({ preventScroll: true });
  // The shield now offers a hint; it never bypasses the collision question.
  const eliminated = game.quizHint
    ? q.choices
        .map((choice, i) => (choice.correct ? -1 : i))
        .filter((i) => i >= 0)
        .slice(0, 2)
    : [];
  q.choices.forEach((choice, i) => {
    const b = document.createElement("button");
    b.className = "answer";
    b.innerHTML = `<kbd>${i + 1}</kbd><span></span>`;
    b.querySelector("span").textContent = choice.text;
    if (eliminated.includes(i)) {
      choice.eliminated = true;
      b.disabled = true;
      b.classList.add("eliminated");
      b.setAttribute(
        "aria-label",
        `${choice.text} — removed by your quiz shield`,
      );
    }
    b.onclick = () => answer(i);
    $("answers").append(b);
  });
  if (game.quizHint)
    $("quizFeedback").textContent =
      "Quiz shield: two wrong choices removed. Answer correctly to keep your life.";
  $("continueButton").onclick = () => {
    game.continueAfterQuiz();
    if (game.state === "running")
      toast(
        `Level ${game.level} · ${WORLDS[Math.min(game.level - 1, 3)].name}`,
      );
  };
}
function answer(index) {
  if (
    game.state !== "quiz" ||
    !currentQuestion.choices[index] ||
    currentQuestion.choices[index].eliminated
  )
    return;
  const correct = currentQuestion.choices[index].correct;
  const reward = game.level * 100;
  game.answer(correct);
  document.querySelectorAll(".answer").forEach((b, i) => {
    b.disabled = true;
    if (currentQuestion.choices[i].correct) b.classList.add("correct");
    else if (i === index) b.classList.add("wrong");
  });
  $("quizFeedback").textContent =
    `${correct ? `Correct — life saved! +${reward} points. ` : "Not quite — one heart lost. "}${currentQuestion.explanation}`;
  $("continueButton").hidden = false;
  $("continueButton").textContent =
    game.lives <= 0
      ? "See your adventure"
      : correct
        ? `Explore level ${game.level} →`
        : "Keep trying →";
  $("continueButton").focus({ preventScroll: true });
  if (correct) {
    progress.bestLevel = Math.max(progress.bestLevel, game.level);
    persist();
  }
}
function persist() {
  storageAvailable = saveProgress(progress);
}
function showGameOver() {
  const score = Math.floor(game.score),
    record = score > progress.highScore;
  progress.highScore = Math.max(progress.highScore, score);
  progress.bestLevel = Math.max(progress.bestLevel, game.level);
  progress.runs.push({
    score,
    level: game.level,
    correct: game.correct,
    questions: game.questions,
    date: new Date().toISOString(),
  });
  progress.runs.sort((a, b) => b.score - a.score);
  progress.runs = progress.runs.slice(0, 10);
  persist();
  refresh();
  overlay(
    `<p class="overlay-eyebrow">${record ? "✦ A NEW PERSONAL BEST" : "EVERY ADVENTURE TEACHES YOU SOMETHING"}</p><h2>A little wiser. A little braver.</h2><p>You reached level ${game.level} and made ${game.correct} new discover${game.correct === 1 ? "y" : "ies"}.<br>There’s always more beyond the horizon.</p><div class="result-stats"><div><strong>${number(score)}</strong><span>YOUR SCORE</span></div><div><strong>${number(progress.highScore)}</strong><span>PERSONAL BEST</span></div></div><div class="overlay-actions"><button id="playAgain" class="primary-button">${icon("play")}One more adventure</button><button id="viewScores" class="secondary-button">${icon("cup")}</button></div>`,
  );
  $("playAgain").onclick = start;
  $("viewScores").setAttribute("aria-label", "View leaderboard");
  $("viewScores").onclick = showLeaderboard;
}
function openDialog(html) {
  dialogPaused = game.state === "running";
  if (dialogPaused) game.pause();
  $("dialogContent").innerHTML = html;
  $("infoDialog").showModal();
  $("closeDialog").focus();
}
function closeDialog() {
  if ($("infoDialog").open) $("infoDialog").close();
}
$("infoDialog").addEventListener("close", () => {
  if (dialogPaused && game.state === "paused") game.resume();
  dialogPaused = false;
});
$("closeDialog").onclick = closeDialog;
$("infoDialog").addEventListener("click", (e) => {
  if (e.target === $("infoDialog")) {
    const r = $("infoDialog").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeDialog();
  }
});
function showHelp() {
  openDialog(`<p class="overlay-eyebrow">YOUR FIELD GUIDE</p><h2 id="dialogTitle">A small guide to big adventures.</h2><p class="dialog-subtitle">An endless runner for your feet. A little workout for your mind.</p>
  <div class="help-step"><span class="step-number">01</span><div><h3>Find your stride</h3><p>Press Space or ↑ to jump over cacti and rocks. Hold ↓ to duck under birds from level 3. On mobile, tap the game or use the jump and duck buttons.</p></div></div>
  <div class="help-step"><span class="step-number">02</span><div><h3>Let curiosity lead</h3><p>When the dino hits any hurdle, the world pauses immediately for a Maths or Science question. Your lives stay unchanged until you answer. Pick one of four answers (or press 1–4). Correct answers save your life, earn 100 × your current level in points and unlock the next stage. A wrong answer costs one life; you stay on the same level.</p></div></div>
  <div class="help-step"><span class="step-number">03</span><div><h3>Keep a little magic handy</h3><p>Collect a quiz shield to remove two wrong choices from your next question, 2× points for an 8-second boost, or a heart for an extra life. You can hold up to 3 lives. Full hearts? A heart pickup earns 50 points.</p></div></div>
  <div class="help-step"><span class="step-number">04</span><div><h3>Make the adventure yours</h3><p>Choose your subjects before starting. Questions grow from foundations to Class 8 topics. Press P or Escape to pause. Your best scores and unlocked worlds are saved on this browser.</p></div></div><p class="dialog-foot">No time limit on questions. Learn at your own pace.</p>`);
}
function showJourney() {
  openDialog(
    `<p class="overlay-eyebrow">A WORLD WAITING TO BE DISCOVERED</p><h2 id="dialogTitle">Your journey</h2><p class="dialog-subtitle">One correct answer. One new chapter. Reach level 4 to discover every landscape, then keep running as the challenge grows.</p>${WORLDS.map((world, i) => `<div class="journey-row"><div class="world-thumb ${["meadow", "desert", "aurora", "aurora"][i]}">${String(i + 1).padStart(2, "0")}</div><div><h3>${world.name}</h3><p>${["Your first steps. Single cacti and gentle jumps.", "Rocky paths and a quicker stride.", "Watch the skies. Duck under passing birds.", "Cactus pairs and your greatest challenge yet."][i]}</p></div><span class="status">${progress.bestLevel >= i + 1 ? "Unlocked" : `Level ${i + 1}`}</span></div>`).join("")}<p class="dialog-foot">Highest level reached: ${progress.bestLevel} · Each run begins in the meadow.</p>`,
  );
}
function showLeaderboard() {
  openDialog(
    `<p class="overlay-eyebrow">LITTLE STEPS. PERSONAL BESTS.</p><h2 id="dialogTitle">Your hall of adventures</h2><p class="dialog-subtitle">Your top 10 runs, right here on this browser. Can you go a little further next time?</p>${progress.runs.length ? progress.runs.map((run, i) => `<div class="leader-row"><span class="rank">${String(i + 1).padStart(2, "0")}</span><div><strong>Level ${run.level} explorer</strong><small>${new Date(run.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${Number(run.correct) || 0} correct answers</small></div><b>${number(run.score)}</b></div>`).join("") : `<div class="empty-state">${icon("cup")}Great adventures start with a first step.<br>Finish a run to set your first personal best.</div>`}<p class="dialog-foot ${storageAvailable ? "" : "warning"}">${storageAvailable ? "Scores are saved locally on this device. No account needed." : "Browser storage is unavailable. Scores last for this session only."}</p>`,
  );
}
function updateSound() {
  $("soundButton").setAttribute("aria-pressed", !sounds.enabled);
  $("soundButton").setAttribute(
    "aria-label",
    sounds.enabled ? "Mute sound" : "Enable sound",
  );
}
$("soundButton").onclick = () => {
  sounds.enabled = !sounds.enabled;
  progress.muted = !sounds.enabled;
  persist();
  updateSound();
  if (sounds.enabled) sounds.start();
};
$("startButton").onclick = start;
$("pauseButton").onclick = () =>
  game.state === "paused" ? game.resume() : game.pause();
$("howButton").onclick = showHelp;
$("journeyNav").onclick = showJourney;
$("exploreButton").onclick = showJourney;
$("leaderboardNav").onclick = showLeaderboard;
$("adventureNav").onclick = () => {
  closeDialog();
  $("playfield").scrollIntoView({ behavior: "smooth", block: "center" });
};
document.querySelectorAll("[data-subject]").forEach(
  (button) =>
    (button.onclick = () => {
      const subject = button.dataset.subject;
      if (subjects.has(subject)) {
        if (subjects.size === 1) {
          toast("Keep at least one subject in your mix.");
          return;
        }
        subjects.delete(subject);
      } else subjects.add(subject);
      button.setAttribute("aria-pressed", subjects.has(subject));
      refresh();
    }),
);
$("gameCanvas").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (game.state === "ready") start();
  else game.jump();
});
$("jumpButton").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (game.state === "ready") start();
  else game.jump();
});
$("duckButton").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  game.duck(true);
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  $("duckButton").addEventListener(event, () => game.duck(false));
document.addEventListener("keydown", (e) => {
  if ($("infoDialog").open) return;
  if (
    ["Space", "ArrowUp", "ArrowDown"].includes(e.code) &&
    !["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)
  )
    e.preventDefault();
  if (e.repeat) return;
  if (e.code === "KeyP" || e.code === "Escape") {
    if (game.state === "paused") game.resume();
    else game.pause();
    return;
  }
  if (game.state === "quiz" && /^[1-4]$/.test(e.key)) {
    answer(Number(e.key) - 1);
    return;
  }
  if (e.code === "ArrowDown") {
    game.duck(true);
    return;
  }
  if (e.code === "Space" || e.code === "ArrowUp") {
    // Let focused buttons keep their native Space activation, including quiz options.
    if (e.target.tagName === "BUTTON") return;
    if (game.state === "ready" || game.state === "over") start();
    else if (game.state === "running") game.jump();
  }
});
document.addEventListener("keyup", (e) => {
  if (e.code === "ArrowDown") game.duck(false);
});
window.addEventListener("blur", () => {
  game.duck(false);
  game.pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.duck(false);
    game.pause();
  }
});
