import { Dinosaur, CONFIG } from "./dinosaur.js";
import { sounds } from "./audio.js";
import { Renderer } from "./renderer.js";

export const intersects = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;
export class Game {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.hooks = hooks;
    this.renderer = new Renderer(canvas);
    this.dinosaur = new Dinosaur();
    this.reset();
    this.state = "ready";
    this.lastTime = 0;
    this.accumulator = 0;
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }
  reset() {
    this.state = "running";
    this.level = 1;
    this.lives = 3;
    this.score = 0;
    this.distance = 0;
    this.elapsed = 0;
    this.cleared = 0;
    this.totalCleared = 0;
    this.correct = 0;
    this.questions = 0;
    this.obstacles = [];
    this.pickups = [];
    this.particles = [];
    this.spawnDistance = 180;
    this.spawnCount = 0;
    this.invulnerable = 0;
    this.shield = false;
    this.doubleTime = 0;
    this.quizHint = false;
    this.dinosaur.reset();
    this.dinosaur.ducking = false;
    this.dinosaur.justLanded = false;
  }
  start() {
    this.reset();
    sounds.start();
    this.hooks.change?.();
    this.canvas.focus({ preventScroll: true });
  }
  get speed() {
    return (
      Math.min(560, 320 + (this.level - 1) * 28) *
      (this.renderer.width < 650 ? 0.76 : 1)
    );
  }
  jump() {
    if (this.state !== "running") return;
    this.dinosaur.ducking = false;
    if (this.dinosaur.jump()) {
      sounds.jump();
      this.burst(this.dinosaur.x + 25, 330, 4, "#a4be8c");
    }
  }
  duck(value) {
    this.dinosaur.ducking = value && this.state === "running";
  }
  pause() {
    if (this.state !== "running") return;
    this.state = "paused";
    this.dinosaur.ducking = false;
    this.hooks.pause?.();
  }
  resume() {
    if (this.state !== "paused") return;
    this.state = "running";
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.hooks.change?.();
    this.canvas.focus({ preventScroll: true });
  }
  answer(correct) {
    if (this.state !== "quiz") return false;
    this.questions++;
    this.state = "feedback";
    if (correct) {
      this.correct++;
      this.score += 100 * this.level;
      this.level++;
      sounds.milestone();
    } else {
      this.lives--;
      sounds.crash();
    }
    this.hooks.change?.();
    return true;
  }
  continueAfterQuiz() {
    if (this.state !== "feedback") return;
    if (this.lives <= 0) {
      this.end();
      return;
    }
    this.cleared = 0;
    this.quizHint = false;
    this.obstacles = [];
    this.pickups = [];
    this.spawnDistance = 200;
    this.invulnerable = 1.5;
    this.state = "running";
    this.dinosaur.reset();
    this.dinosaur.ducking = false;
    this.hooks.change?.();
    this.canvas.focus({ preventScroll: true });
  }
  end() {
    if (this.state === "over") return;
    this.state = "over";
    this.dinosaur.ducking = false;
    this.hooks.over?.();
  }
  burst(x, y, count, color) {
    if (this.renderer.reduced) count = Math.min(count, 3);
    for (let i = 0; i < count; i++)
      this.particles.push({
        x,
        y,
        vx: Math.random() * 130 - 80,
        vy: -Math.random() * 120 - 20,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 2 + Math.random() * 3,
        color,
      });
  }
  collect(item) {
    if (item.kind === "shield") {
      this.shield = true;
      this.hooks.toast?.("Quiz shield collected · two wrong choices removed");
    }
    if (item.kind === "double") {
      this.doubleTime = 8;
      this.hooks.toast?.("Double points · 8 seconds of glory");
    }
    if (item.kind === "heart") {
      if (this.lives < 3) {
        this.lives++;
        this.hooks.toast?.("Extra life · keep the quest alive");
      } else {
        this.score += 50;
        this.hooks.toast?.("Full hearts! +50 bonus points");
      }
    }
    sounds.milestone();
    this.burst(item.x, item.y, 18, "#d1e7ad");
    this.hooks.change?.();
  }
  spawn() {
    this.spawnCount++;
    let kind = "cactus",
      height = 38 + Math.random() * 15,
      width = 33;
    if (this.level >= 2 && this.spawnCount % 3 === 0) {
      kind = "rock";
      height = 35;
      width = 49;
    }
    if (this.level >= 3 && this.spawnCount % 4 === 0) {
      kind = "bird";
      height = 24;
      width = 44;
    }
    if (this.level >= 4 && kind === "cactus" && this.spawnCount % 2 === 0) {
      width = 62;
      height = 48;
    }
    this.obstacles.push({
      kind,
      height,
      width,
      x: this.renderer.width + 30,
      y: kind === "bird" ? CONFIG.groundY - 57 : CONFIG.groundY - height,
      passed: false,
      hit: false,
    });
    // Items appear in the safe gap AFTER an obstacle, never inside one.
    if (this.spawnCount % 3 === 0) {
      const kinds = ["shield", "double", "heart"];
      this.pickups.push({
        kind: kinds[Math.floor(this.spawnCount / 3 - 1) % 3],
        x: this.renderer.width + this.speed * 0.9 + 30,
        y: CONFIG.groundY - 65,
      });
    }
    this.spawnDistance =
      this.speed *
      (1.75 + Math.random() * 0.45 - Math.min(this.level - 1, 8) * 0.035);
  }
  update(dt) {
    if (this.state !== "running") return;
    const speed = this.speed,
      d = this.dinosaur;
    this.elapsed += dt;
    this.distance += speed * dt;
    this.score += 14 * (speed / 320) * dt * (this.doubleTime > 0 ? 2 : 1);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.doubleTime = Math.max(0, this.doubleTime - dt);
    d.update(dt);
    if (d.justLanded) {
      this.burst(d.x + 25, 330, 5, "#a4be8c");
      d.justLanded = false;
    }
    if (d.onGround && Math.random() < dt * 9)
      this.burst(d.x + 20, 330, 1, "#a4be8c");
    this.spawnDistance -= speed * dt;
    if (this.spawnDistance <= 0) this.spawn();
    for (const o of this.obstacles) {
      o.x -= speed * dt;
      const box = {
        x: o.x + 5,
        y: o.y + 4,
        width: o.width - 9,
        height: o.height - 5,
      };
      if (!o.hit && intersects(d.hitbox, box)) {
        // Freeze on the collision frame. Only a wrong answer can cost a life.
        o.hit = true;
        this.state = "quiz";
        this.quizHint = this.shield;
        this.shield = false;
        d.ducking = false;
        this.burst(d.x + 30, d.y + 25, 18, "#e7b1a0");
        sounds.start();
        this.hooks.quiz?.();
        return; // Prevent another collision, pickup or score update during the quiz.
      }
      if (!o.passed && o.x + o.width < d.x) {
        o.passed = true;
        this.cleared++;
        this.totalCleared++;
        this.score += 10 * (this.doubleTime > 0 ? 2 : 1);
        this.hooks.change?.();
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.x + o.width > -20);
    for (const item of this.pickups) {
      item.x -= speed * dt;
      if (
        !item.collected &&
        intersects(d.hitbox, {
          x: item.x - 18,
          y: item.y - 18,
          width: 36,
          height: 36,
        })
      ) {
        item.collected = true;
        this.collect(item);
      }
    }
    this.pickups = this.pickups.filter((i) => i.x > -20 && !i.collected);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  tick(time) {
    const dt = Math.min((time - (this.lastTime || time)) / 1000, 0.05);
    this.lastTime = time;
    this.accumulator += dt;
    while (this.accumulator >= 1 / 120) {
      this.update(1 / 120);
      this.accumulator -= 1 / 120;
    }
    this.renderer.scene(this, time / 1000);
    this.hooks.frame?.();
    requestAnimationFrame(this.tick);
  }
}
