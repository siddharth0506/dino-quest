import test from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../dist/data/questions.js";
import { Game, intersects } from "../dist/js/engine.js";
import { Dinosaur, CONFIG } from "../dist/js/dinosaur.js";
import { sounds } from "../dist/js/audio.js";
import { readProgress, saveProgress } from "../dist/js/storage.js";

// Canvas/animation stubs isolate the actual physics and state machine from a browser.
globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ matches: false });
globalThis.ResizeObserver = class {
  observe() {}
};
globalThis.requestAnimationFrame = () => {};
sounds.enabled = false;
const gradient = { addColorStop() {} };
const ctx = new Proxy(
  {},
  {
    get: (target, key) =>
      target[key] ??
      (key === "createLinearGradient" || key === "createRadialGradient"
        ? () => gradient
        : () => {}),
  },
);
const canvas = {
  getContext: () => ctx,
  getBoundingClientRect: () => ({ width: 1150, height: 410 }),
  focus() {},
};
const makeGame = (hooks = {}) => {
  const g = new Game(canvas, hooks);
  g.start();
  return g;
};
const step = (g, seconds) => {
  for (let n = 0; n < seconds * 120; n++) g.update(1 / 120);
};
const obstacle = (g, extra = {}) => ({
  x: g.dinosaur.x + 8,
  y: 290,
  width: 33,
  height: 40,
  kind: "cactus",
  passed: false,
  hit: false,
  ...extra,
});

test("question bank has 36 valid, unique questions and balanced subjects/tiers", () => {
  assert.equal(QUESTIONS.length, 36);
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, 36);
  for (const subject of ["Maths", "Science"])
    for (const difficulty of [1, 2, 3])
      assert.equal(
        QUESTIONS.filter(
          (q) => q.subject === subject && q.difficulty === difficulty,
        ).length,
        6,
      );
  for (const q of QUESTIONS) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
    assert.ok(q.explanation.length > 15);
  }
});
test("retained dinosaur physics land exactly and prevent midair jumping", () => {
  const d = new Dinosaur();
  assert.ok(d.jump());
  assert.equal(d.jump(), false);
  let peak = d.y;
  for (let i = 0; i < 120; i++) {
    d.update(1 / 120);
    peak = Math.min(peak, d.y);
  }
  assert.ok(peak < CONFIG.groundY - d.height - 120);
  assert.equal(d.y, CONFIG.groundY - d.height);
  assert.equal(d.onGround, true);
  assert.equal(d.velocityY, 0);
});
test("duck hitbox clears birds but remains vulnerable to ground obstacles", () => {
  const g = makeGame();
  g.duck(true);
  const bird = { x: 130, y: 277, width: 35, height: 19 };
  assert.equal(intersects(g.dinosaur.hitbox, bird), false);
  assert.equal(
    intersects(g.dinosaur.hitbox, { x: 130, y: 295, width: 25, height: 35 }),
    true,
  );
  g.duck(false);
  assert.equal(intersects(g.dinosaur.hitbox, bird), true);
});
test("collision opens exactly one quiz immediately without losing a life", () => {
  let quizzes = 0;
  const g = makeGame({ quiz: () => quizzes++ });
  g.obstacles = [obstacle(g), obstacle(g)];
  g.update(1 / 120);
  assert.equal(g.state, "quiz");
  assert.equal(g.lives, 3);
  assert.equal(quizzes, 1);
  const frozen = [g.score, g.distance, g.elapsed, g.dinosaur.y];
  step(g, 5);
  assert.deepEqual([g.score, g.distance, g.elapsed, g.dinosaur.y], frozen);
  assert.equal(g.lives, 3);
  assert.equal(quizzes, 1);
});
test("shield supplies a hint but still immediately opens the collision quiz", () => {
  const g = makeGame();
  g.shield = true;
  g.obstacles = [obstacle(g)];
  g.update(1 / 120);
  assert.equal(g.state, "quiz");
  assert.equal(g.lives, 3);
  assert.equal(g.shield, false);
  assert.equal(g.quizHint, true);
  g.answer(false);
  assert.equal(g.lives, 2);
  g.continueAfterQuiz();
  assert.equal(g.quizHint, false);
});
test("three wrong collision answers cause exactly one game over", () => {
  let ended = 0;
  const g = makeGame({ over: () => ended++ });
  for (let i = 0; i < 3; i++) {
    g.obstacles = [obstacle(g)];
    g.update(1 / 120);
    assert.equal(g.state, "quiz");
    assert.equal(g.lives, 3 - i);
    g.answer(false);
    assert.equal(g.answer(false), false);
    assert.equal(g.lives, 2 - i);
    g.continueAfterQuiz();
  }
  assert.equal(g.state, "over");
  assert.equal(ended, 1);
  g.end();
  assert.equal(ended, 1);
});
test("passing five hurdles does not open a quiz", () => {
  let quizzes = 0;
  const g = makeGame({ quiz: () => quizzes++ });
  g.obstacles = Array.from({ length: 5 }, () => obstacle(g, { x: 20 }));
  g.update(1 / 120);
  assert.equal(g.state, "running");
  assert.equal(g.cleared, 5);
  assert.equal(quizzes, 0);
});
test("mid-jump collision opens the question before landing", () => {
  const g = makeGame();
  g.jump();
  g.obstacles = [obstacle(g)];
  g.update(1 / 120);
  assert.equal(g.state, "quiz");
  assert.equal(g.dinosaur.onGround, false);
  assert.equal(g.lives, 3);
  g.answer(true);
  assert.equal(g.lives, 3);
  g.continueAfterQuiz();
  assert.equal(g.obstacles.length, 0);
  assert.equal(g.dinosaur.onGround, true);
  step(g, 0.2);
  assert.equal(g.state, "running");
  assert.equal(g.lives, 3);
});
test("correct quiz answer rewards points, unlocks a faster stage, rejects duplicate answers", () => {
  const g = makeGame();
  g.state = "quiz";
  const oldSpeed = g.speed;
  assert.equal(g.answer(true), true);
  assert.equal(g.score, 100);
  assert.equal(g.level, 2);
  assert.ok(g.speed > oldSpeed);
  assert.equal(g.lives, 3);
  assert.equal(g.answer(true), false);
  assert.equal(g.score, 100);
  g.continueAfterQuiz();
  assert.equal(g.state, "running");
  assert.equal(g.cleared, 0);
  assert.equal(g.obstacles.length, 0);
  assert.ok(g.invulnerable > 0);
});
test("incorrect answer removes one life without advancing, regardless of shield", () => {
  const g = makeGame();
  g.state = "quiz";
  g.shield = true;
  g.answer(false);
  assert.equal(g.lives, 2);
  assert.equal(g.level, 1);
  assert.equal(g.score, 0);
  assert.equal(g.shield, true);
  g.continueAfterQuiz();
  assert.equal(g.state, "running");
});
test("last-life incorrect answer shows feedback before game over", () => {
  const g = makeGame();
  g.lives = 1;
  g.state = "quiz";
  g.answer(false);
  assert.equal(g.state, "feedback");
  assert.equal(g.lives, 0);
  g.continueAfterQuiz();
  assert.equal(g.state, "over");
});
test("pause freezes timers, score and obstacles; resume preserves the run", () => {
  const g = makeGame();
  g.doubleTime = 8;
  g.obstacles = [obstacle(g, { x: 900 })];
  step(g, 0.1);
  g.pause();
  const before = [g.score, g.distance, g.doubleTime, g.obstacles[0].x];
  step(g, 3);
  assert.deepEqual(
    [g.score, g.distance, g.doubleTime, g.obstacles[0].x],
    before,
  );
  g.resume();
  step(g, 0.1);
  assert.ok(g.score > before[0]);
});
test("power-ups grant shield, timed double points and capped lives", () => {
  const g = makeGame();
  g.collect({ kind: "shield", x: 300, y: 200 });
  assert.equal(g.shield, true);
  g.collect({ kind: "double", x: 300, y: 200 });
  assert.equal(g.doubleTime, 8);
  const before = g.score;
  g.update(1 / 120);
  assert.ok(Math.abs(g.score - before - 28 / 120) < 0.001);
  g.lives = 2;
  g.collect({ kind: "heart", x: 300, y: 200 });
  assert.equal(g.lives, 3);
  const s = g.score;
  g.collect({ kind: "heart", x: 300, y: 200 });
  assert.equal(g.lives, 3);
  assert.equal(g.score, s + 50);
});
test("touch pickup collision consumes the item once", () => {
  const g = makeGame();
  g.lives = 2;
  g.pickups = [{ kind: "heart", x: 140, y: 305 }];
  g.update(1 / 120);
  assert.equal(g.lives, 3);
  assert.equal(g.pickups.length, 0);
});
test("new obstacles unlock progressively and speed is bounded", () => {
  const g = makeGame();
  g.level = 2;
  g.spawnCount = 2;
  g.spawn();
  assert.equal(g.obstacles.at(-1).kind, "rock");
  g.level = 3;
  g.spawnCount = 3;
  g.spawn();
  assert.equal(g.obstacles.at(-1).kind, "bird");
  g.level = 4;
  g.spawnCount = 1;
  g.spawn();
  assert.equal(g.obstacles.at(-1).width, 62);
  g.level = 1000;
  assert.equal(g.speed, 560);
});
test("restart clears prior-run powers, progress and health damage", () => {
  const g = makeGame();
  g.level = 7;
  g.lives = 1;
  g.score = 999;
  g.shield = true;
  g.doubleTime = 7;
  g.state = "over";
  g.start();
  assert.equal(g.level, 1);
  assert.equal(g.lives, 3);
  assert.equal(g.score, 0);
  assert.equal(g.shield, false);
  assert.equal(g.doubleTime, 0);
  assert.equal(g.state, "running");
});
test("renderer executes desktop/mobile scenes, all worlds and all obstacle kinds", () => {
  const g = makeGame();
  for (const width of [480, 800, 1280])
    for (const level of [1, 2, 3, 4, 20]) {
      g.renderer.width = width;
      g.level = level;
      g.obstacles = ["bird", "rock", "cactus"].map((kind) =>
        obstacle(g, { kind }),
      );
      g.pickups = ["shield", "double", "heart"].map((kind) => ({
        kind,
        x: 400,
        y: 265,
      }));
      g.renderer.scene(g, 1);
      g.state = "ready";
      g.renderer.scene(g, 2);
      g.state = "running";
    }
});
test("personal leaderboard survives storage round-trip and rejects malformed records", () => {
  let value;
  globalThis.localStorage = {
    setItem: (_, v) => (value = v),
    getItem: () => value,
  };
  const data = {
    highScore: 342,
    bestLevel: 3,
    muted: true,
    runs: [{ score: 342, level: 3, date: "2026-01-01", correct: 2 }],
  };
  assert.equal(saveProgress(data), true);
  assert.deepEqual(readProgress(), data);
  value = '{"runs":[{"score":"oops"}],"highScore":0}';
  assert.equal(readProgress().runs.length, 0);
});
test("storage denial and corrupt JSON do not prevent play", () => {
  globalThis.localStorage = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("denied");
    },
  };
  assert.equal(readProgress().highScore, 0);
  assert.equal(saveProgress({}), false);
  globalThis.localStorage = { getItem: () => "{bad" };
  assert.equal(readProgress().bestLevel, 1);
});
