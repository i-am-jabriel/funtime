import { isColliding, render, enemies, context, canvas, getThetaFromDirections } from "./helper.js";

export default class Fireball {
  static spawn(owner, max){
    const theta = getThetaFromDirections(owner);
    let i = 0;
    const spawner = setInterval(()=>{
      owner.gravityForce *= .9;
      new Fireball(owner, ++i, theta, max);
      if(i === max) clearInterval(spawner);
    }, 10);
  }
  constructor(owner, i, theta, max) {
    this.owner = owner;
    const ratio = (i - 5) / max;
    render.push(this);
    this.x = owner.cx + owner.direction * 20;
    this.y = owner.cy;
    // this.dx = (8 - (6 * (mario.up || mario.down) *  (i - 4) / 4)) * (-mario.left * mario.right || (((mario.up || mario.down) ? (mario.left || mario.right) : 1) * mario.direction));
    // this.dy = -mario.up * 8 + mario.down * 6 + 1 * (i - 4) * (!mario.up && !mario.down);
    this.dx = 10 * Math.cos(theta) + 5 * ratio;
    this.dy = 12 * Math.sin(-theta) - (10 * ratio) * !(owner.up || owner.down) + owner.gravityForce * .05 - owner.jumpForce * .1;
    this.direction = this.dx / Math.abs(this.dx);
    this.size = 15;
    this.dSize = 0.1;
    this.frames = 144;
    this.maxFrames = 144;
    this.damage = 2;
  }
  get cx() { return this.x - this.size * .5}
  get cy() { return this.y - this.size * .5}
  draw(dt) {
    this.x += this.dx * dt;
    this.y += this.dy * dt;
    this.size -= this.dSize * dt;
    this.h = this.size;
    this.w = this.size;
    if (this.size <= 0) return this.destroy();
    const damp = 0.1 * dt * Math.pow(this.frames / this.maxFrames, 2);
    enemies.forEach((enemy) => {
      if(isColliding(this, enemy) && enemy.takeDamage(this, this.damage * dt)){
        this.x = this.x.moveTowards(enemy.cx || enemy.x + enemy.w * .5 || enemy.x, dt * this.dx * 3 + 10 * dt + this.size * .2 * dt);
        this.y = this.y.moveTowards(enemy.cy || enemy.y + enemy.w * .5 || enemy.y, dt * this.dy * 3 + 10 * dt + this.size * .2 * dt);
        this.dx -= .2 * this.dx * dt - .4 * this.direction * dt;
        this.dy -= .2 * this.dy * dt - .4 * this.dy / Math.abs(this.dy) * dt;
        this.size += .005 * this.size * dt - .12 * dt + .13 * (1 - damp);
        this.damage -= 120 * this.damage * (1 - damp) - .009 * this.size * dt - this.damage * dt * .018 * this.size;
        this.damage = Math.max(this.damage, .001);
        this.size = Math.max(this.size, .01);
      }
    });
    context.beginPath();
    context.fillStyle = "orange";
    context.arc(this.x , this.y, this.size, 0, Math.PI * 2);
    context.fill();
    this.dy += 0.3 * dt;
    this.damage -= this.damage * .33 * damp;
    this.dx -= damp * this.dx * .15;
    this.dy -= damp * this.dy > 0 ? 0.05 : -0.05;
    if (this.y >= canvas.height) {
      this.dy *= -0.8;
      this.dx *= 0.8;
      this.size *= .9;
    }
    if ((this.frames -= dt) <= 0 || Math.abs(this.dx) < .001 || this.size < .1) {
      // this.frames <= 0 && console.log('out of frames');
      // Math.abs(this.dx) < .001 && console.log('too slow');
      // this.size < .1 && console.log('too small');
      // this.damage < .001 && console.log('too little damage');
      this.destroy();
    }
  }
  destroy() {
    render.splice(render.indexOf(this), 1);
  }
}