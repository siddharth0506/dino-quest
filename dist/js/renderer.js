import { CONFIG } from "./dinosaur.js";

export const WORLDS = [
  {
    name: "Moonlit meadow",
    sky: ["#1c2934", "#334e4b"],
    far: "#364d54",
    mid: "#304c4a",
    near: "#28473f",
    ground: "#233d32",
    grass: "#829b65",
    accent: "#c5e7a5",
  },
  {
    name: "Amber dunes",
    sky: ["#302b3f", "#756257"],
    far: "#665667",
    mid: "#77645f",
    near: "#685e4a",
    ground: "#464538",
    grass: "#b7a479",
    accent: "#ecd9a1",
  },
  {
    name: "Aurora valley",
    sky: ["#182637", "#3b5267"],
    far: "#3e4f6a",
    mid: "#394e65",
    near: "#2e4659",
    ground: "#243f48",
    grass: "#89afb7",
    accent: "#c1dce8",
  },
  {
    name: "Crystal peaks",
    sky: ["#29253d", "#584a66"],
    far: "#514563",
    mid: "#4e4964",
    near: "#3e4054",
    ground: "#303c45",
    grass: "#9d96b4",
    accent: "#dbc4e9",
  },
];
const mix = (a, b, t) =>
  "#" +
  [1, 3, 5]
    .map((i) =>
      Math.round(
        parseInt(a.slice(i, i + 2), 16) * (1 - t) +
          parseInt(b.slice(i, i + 2), 16) * t,
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const seed = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.width = 1100;
    this.height = 410;
    this.palette = { ...WORLDS[0], sky: [...WORLDS[0].sky] };
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.width = Math.max(480, (rect.width / rect.height) * 410);
    this.scaleX = this.canvas.width / this.width;
    this.scaleY = this.canvas.height / 410;
  }
  scene(game, time) {
    const ctx = this.ctx,
      w = this.width,
      h = this.height;
    ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    const target = WORLDS[Math.min(game.level - 1, 3)];
    for (const key of ["far", "mid", "near", "ground", "grass", "accent"])
      this.palette[key] = mix(this.palette[key], target[key], 0.035);
    this.palette.sky = this.palette.sky.map((v, i) =>
      mix(v, target.sky[i], 0.035),
    );
    const p = this.palette,
      gradient = ctx.createLinearGradient(0, 0, 0, 330);
    gradient.addColorStop(0, p.sky[0]);
    gradient.addColorStop(1, p.sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    // Deterministic stars, soft moonlight, and independent landscape layers.
    for (let i = 0; i < 48; i++) {
      const x = seed(i) * w,
        y = seed(i + 80) * 235;
      ctx.globalAlpha =
        0.18 +
        seed(i + 30) * 0.45 +
        (this.reduced ? 0 : Math.sin(time * 0.6 + i) * 0.08);
      ctx.fillStyle = "#d9e6c9";
      ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
      if (i % 13 === 0) {
        ctx.fillRect(x - 2, y + 0.5, 5, 1);
        ctx.fillRect(x, y - 1.5, 1, 5);
      }
    }
    ctx.globalAlpha = 1;
    const moonX = w * 0.82,
      moonY = 88;
    const glow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 105);
    glow.addColorStop(0, "#e4e7b912");
    glow.addColorStop(1, "#e4e7b900");
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - 110, moonY - 110, 220, 220);
    ctx.fillStyle = "#dedfbc";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c2c6aa55";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(
        moonX - 9 + i * 6,
        moonY - 11 + seed(i) * 24,
        3 + seed(i + 1) * 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    if (game.level >= 3) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = "#a2d6be";
      ctx.beginPath();
      ctx.moveTo(0, 50);
      ctx.bezierCurveTo(w * 0.4, 100, w * 0.5, -50, w, 90);
      ctx.bezierCurveTo(w * 0.5, 0, w * 0.4, 160, 0, 80);
      ctx.fill();
      ctx.restore();
    }
    const shift = this.reduced ? 0 : game.distance;
    this.mountains(shift * 0.06, 225, 75, p.far, 0);
    this.mountains(shift * 0.13, 272, 62, p.mid, 4);
    this.mountains(shift * 0.25, 306, 47, p.near, 8);
    // Pines, ferns, and ruins give the foreground a sense of scale.
    for (let i = 0; i < 10; i++) {
      const span = w + 170,
        x = ((((i * 173 - shift * 0.3) % span) + span) % span) - 70;
      this.tree(x, 312, 32 + seed(i) * 37, p.near);
    }
    ctx.fillStyle = p.ground;
    ctx.fillRect(0, CONFIG.groundY, w, 80);
    ctx.fillStyle = p.grass;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, CONFIG.groundY, w, 2);
    ctx.globalAlpha = 1;
    const groundGrad = ctx.createLinearGradient(0, 332, 0, 410);
    groundGrad.addColorStop(0, "#071d2010");
    groundGrad.addColorStop(1, "#091c2077");
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, 332, w, 78);
    for (let i = 0; i < 55; i++) {
      const span = w + 30,
        x = (((i * 41 - shift) % span) + span) % span;
      ctx.fillStyle = i % 4 === 0 ? "#8d9d6b50" : "#5f806b55";
      ctx.fillRect(x, 342 + seed(i) * 58, 2 + seed(i + 5) * 8, 2);
    }
    for (let i = 0; i < 16; i++) {
      const span = w + 80,
        x = ((((i * 89 - shift * 0.6) % span) + span) % span) - 30;
      this.grass(x, 332, 11 + seed(i) * 10, p.grass, 0.35);
    }
    if (game.state === "ready") {
      this.cactus(w * 0.78, 330, 42);
      this.cactus(w * 0.81, 330, 29);
      this.grass(w * 0.93, 330, 34, p.grass, 0.8);
      // A welcoming companion in the idle landscape.
      ctx.save();
      ctx.translate(0, this.reduced ? 0 : Math.sin(time * 2) * 1.2);
      game.dinosaur.draw(ctx);
      ctx.restore();
      ctx.fillStyle = "#c1d7a185";
      ctx.font = '8px "DM Sans",sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("YOUR LITTLE EXPLORER", 143, 361);
    } else {
      for (const o of game.obstacles) this.obstacle(o, time);
      for (const item of game.pickups) this.pickup(item, time);
      const d = game.dinosaur;
      ctx.save();
      if (game.invulnerable > 0 && Math.floor(time * 12) % 2 === 0)
        ctx.globalAlpha = 0.45;
      if (game.shield) {
        ctx.strokeStyle = "#afddfa90";
        ctx.lineWidth = 2;
        ctx.fillStyle = "#b1e4ff10";
        ctx.beginPath();
        ctx.ellipse(d.x + 32, d.y + 29, 43, 40, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      d.draw(ctx);
      ctx.restore();
    }
    for (const particle of game.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    if (!this.reduced)
      for (let i = 0; i < 13; i++) {
        const x = seed(i + 400) * w + Math.sin(time * 0.4 + i) * 16,
          y = 250 + seed(i + 500) * 70 + Math.cos(time * 0.6 + i) * 8;
        ctx.globalAlpha = 0.18 + Math.max(0, Math.sin(time + i)) * 0.42;
        ctx.fillStyle = "#d2e5a6";
        ctx.fillRect(x, y, 2, 2);
      }
    ctx.globalAlpha = 1;
  }
  mountains(offset, base, height, color, seedOffset) {
    const c = this.ctx,
      w = this.width,
      period = 700;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(0, 410);
    for (let x = 0; x <= w + 8; x += 8) {
      const px = ((x + offset) / period) * Math.PI * 2;
      const y =
        base -
        Math.abs(Math.sin(px + seedOffset)) * height -
        Math.sin(px * 2.3 + seedOffset) * height * 0.17;
      c.lineTo(x, y);
    }
    c.lineTo(w, 410);
    c.closePath();
    c.fill();
  }
  tree(x, y, h, color) {
    const c = this.ctx;
    c.fillStyle = color;
    c.fillRect(x - 2, y - h, 4, h);
    for (let k = 0; k < 3; k++) {
      const top = y - h + k * h * 0.22;
      c.beginPath();
      c.moveTo(x, top);
      c.lineTo(x - h * 0.28, top + h * 0.53);
      c.lineTo(x + h * 0.28, top + h * 0.53);
      c.closePath();
      c.fill();
    }
  }
  grass(x, y, h, color, alpha = 1) {
    const c = this.ctx;
    c.save();
    c.strokeStyle = color;
    c.globalAlpha = alpha;
    c.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + i * 3,
        y - h * 0.6,
        x + i * 6,
        y - h + Math.abs(i) * 4,
      );
      c.stroke();
    }
    c.restore();
  }
  cactus(x, y, h) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.fillStyle = "#81a77a";
    c.beginPath();
    c.roundRect(10, -h, 12, h, 3);
    c.fill();
    c.fillRect(1, -h * 0.58, 13, 7);
    c.fillRect(1, -h * 0.79, 6, h * 0.25);
    c.fillRect(19, -h * 0.43, 12, 7);
    c.fillRect(26, -h * 0.67, 6, h * 0.28);
    c.fillStyle = "#aec697";
    c.fillRect(13, -h + 6, 3, h - 9);
    c.restore();
  }
  obstacle(o, time) {
    const c = this.ctx;
    if (o.kind === "bird") {
      c.save();
      c.translate(o.x, o.y);
      c.fillStyle = "#d1b6b5";
      c.beginPath();
      c.moveTo(0, 15);
      c.lineTo(18, 8);
      c.lineTo(32, 11);
      c.lineTo(44, 17);
      c.lineTo(26, 20);
      c.lineTo(8, 20);
      c.fill();
      const flap = Math.sin(time * 13) * 13;
      c.beginPath();
      c.moveTo(15, 13);
      c.lineTo(4, -5 + flap);
      c.lineTo(29, 11);
      c.fill();
      c.fillStyle = "#263c3c";
      c.fillRect(31, 12, 3, 3);
      c.restore();
    } else if (o.kind === "rock") {
      c.fillStyle = "#819085";
      c.beginPath();
      c.moveTo(o.x, 330);
      c.lineTo(o.x + 4, 330 - o.height * 0.7);
      c.lineTo(o.x + o.width * 0.4, 330 - o.height);
      c.lineTo(o.x + o.width * 0.8, 330 - o.height * 0.85);
      c.lineTo(o.x + o.width, 330);
      c.fill();
      c.fillStyle = "#b4be9c66";
      c.beginPath();
      c.moveTo(o.x + 4, 330 - o.height * 0.7);
      c.lineTo(o.x + o.width * 0.4, 330 - o.height);
      c.lineTo(o.x + o.width * 0.35, 330);
      c.fill();
    } else {
      this.cactus(o.x, 330, o.height);
      if (o.width > 40) this.cactus(o.x + 28, 330, o.height * 0.78);
    }
  }
  pickup(item, time) {
    const c = this.ctx,
      y = item.y + Math.sin(time * 3) * 4,
      col = { shield: "#a7d5f4", double: "#ead28b", heart: "#e5b0b8" }[
        item.kind
      ];
    c.save();
    c.translate(item.x, y);
    c.shadowBlur = 16;
    c.shadowColor = col;
    c.fillStyle = "#233c3b";
    c.strokeStyle = col;
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, 16, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = col;
    c.font = "bold 14px system-ui";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText({ shield: "◇", double: "2×", heart: "♥" }[item.kind], 0, 1);
    c.restore();
  }
}
