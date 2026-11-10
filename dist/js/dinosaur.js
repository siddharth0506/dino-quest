// Adapted from the uploaded game: pixel dinosaur, animation, jump physics and forgiving hitbox.
export const CONFIG = Object.freeze({
  groundY: 330,
  gravity: 1900,
  jumpVelocity: -720,
});
export class Dinosaur {
  constructor() {
    this.x = 112;
    this.width = 61;
    this.height = 56;
    this.reset();
  }

  reset() {
    this.y = CONFIG.groundY - this.height;
    this.velocityY = 0;
    this.onGround = true;
    this.runTimer = 0;
  }

  jump() {
    if (!this.onGround) return false; // prevent double-jumping
    this.velocityY = CONFIG.jumpVelocity;
    this.onGround = false;

    return true;
  }

  update(dt) {
    this.runTimer += dt * 11;
    if (this.onGround) return;

    // Semi-implicit Euler integration provides stable, natural jumps.
    this.velocityY += CONFIG.gravity * dt;
    this.y += this.velocityY * dt;
    const groundTop = CONFIG.groundY - this.height;
    if (this.y >= groundTop) {
      this.y = groundTop;
      this.velocityY = 0;
      this.onGround = true;
      this.justLanded = true;
    }
  }

  // Slightly forgiving hitbox: leaves out the tail and tip of the snout.
  get hitbox() {
    if (this.ducking && this.onGround)
      return { x: this.x + 13, y: this.y + 31, width: 43, height: 23 };
    return { x: this.x + 13, y: this.y + 9, width: 43, height: 44 };
  }

  draw(context) {
    context.save();
    context.translate(Math.round(this.x), Math.round(this.y));
    if (this.ducking && this.onGround) {
      context.translate(0, 28);
      context.scale(1.15, 0.5);
    }
    const ink = "#bce7a3";
    const highlight = "#dcf7c8";
    const runningFrame = Math.floor(this.runTimer) % 2;
    const rect = (x, y, w, h, color = ink) => {
      context.fillStyle = color;
      context.fillRect(x, y, w, h);
    };

    // Long chunky tail, rounded body, upright neck, big friendly head.
    rect(0, 28, 9, 6);
    rect(6, 31, 12, 8);
    rect(11, 24, 8, 16);
    rect(17, 22, 24, 22);
    rect(33, 15, 11, 19);
    rect(32, 5, 23, 20);
    rect(49, 13, 12, 11);
    rect(45, 22, 13, 4);
    rect(20, 23, 14, 3, highlight);
    rect(35, 8, 7, 3, highlight);

    // Eye, tiny nostril, and pixel smile.
    rect(47, 10, 4, 4, "#fffaf0");
    rect(49, 11, 2, 2, "#163544");
    rect(56, 17, 2, 2, "#132e39");
    rect(52, 22, 6, 2, "#f0c28a");

    // Small T-rex arms.
    rect(36, 29, 12, 4);
    rect(44, 32, 5, 4);

    // Two animated legs alternate as the dinosaur runs.
    if (!this.onGround) {
      rect(20, 41, 8, 8);
      rect(17, 47, 11, 5);
      rect(35, 41, 7, 7);
      rect(35, 46, 12, 5);
    } else if (runningFrame === 0) {
      rect(20, 41, 8, 12);
      rect(16, 51, 14, 5);
      rect(35, 41, 7, 7);
      rect(35, 46, 12, 5);
    } else {
      rect(20, 41, 8, 7);
      rect(17, 46, 13, 5);
      rect(35, 41, 8, 12);
      rect(34, 51, 14, 5);
    }
    context.restore();
  }
}
