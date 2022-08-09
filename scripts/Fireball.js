import { isColliding, render, enemies, canvas, getThetaFromDirections, Random, lerp, getTheta, prob } from "./helper.js";
import { Particle } from "./Particle.js";

export default class Fireball extends Particle {
  color = 'orange';
  // renderMethod =2 'circle';
  atlas = Particle.atlas;
  img = Particle.img;
  animation = 'fireball';
  renderMethod = 'circle';
  color = 'rgba(251, 192, 147, .03)'
  atlasUnpacked = true;
  frameRate = .5;
  name = 'fireball'
  
  animations = {
    fireball: {
      animation: '10FireBallFireBall',
      startX: 0,
      startY: 0,
      frameW: 67,
      frameH: 28,
      frameCountX: 100,
      frames: 6,

      // frameCountX: 3
    }
  }
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
    super();
    this.owner = owner;
    const ratio = (i - 5) / max;
    render.push(this);
    this.x = owner.cx + owner.direction * 5;
    this.y = owner.cy - 14;
    // this.dx = (8 - (6 * (mario.up || mario.down) *  (i - 4) / 4)) * (-mario.left * mario.right || (((mario.up || mario.down) ? (mario.left || mario.right) : 1) * mario.direction));
    // this.dy = -mario.up * 8 + mario.down * 6 + 1 * (i - 4) * (!mario.up && !mario.down);
    this.dx = 10 * Math.cos(theta) + 5 * ratio;
    this.dy = 12 * Math.sin(-theta) - (10 * ratio) * !(owner.up || owner.down) + owner.gravityForce * .05 - owner.jumpPower.value * .1;
    this.direction = this.dx / Math.abs(this.dx);
    this.rotation = getTheta(this.dx, this.dy,1);
    this.size = 50;
    this.dSize = 0.18;
    this.frames = 144;
    this.maxFrames = 144;
    this.damage = .1;
  }
  get cx() { return this.x - this.size * .5}
  get cy() { return this.y - this.size * .5}
  onEnterFrame(dt) {
    this.direction = this.dx / Math.abs(this.dx);
    this.x += this.dx * dt;
    this.y += this.dy * dt;
    this.size -= this.dSize * dt;
    if (this.size <= 0) return this.destroy();
    const damp = 0.1 * dt * Math.pow(this.frames / this.maxFrames, 2);
    this.direction = 1;
    enemies.forEach((enemy) => {
      if(isColliding(this.hitbox, enemy.hitbox) && enemy.takeDamage(this, this.damage * dt)){
        const size = ((enemy.hitbox.w * enemy.hitbox.h) ** .5);
        this.x = this.x.moveTowards(enemy.hitbox.cx - this.w * .5 + Random.range(-.2, .2) * size, dt * this.dx * 6 + dt + this.size * 4 * dt + 10 * dt);
        this.y = this.y.moveTowards(enemy.hitbox.cy - this.h * .5 + Random.range(-.2, .2) * size, dt * this.dy * 6 + dt + this.size * 4 * dt + 10 * dt);
        this.dx -= .3 * this.dx * dt - .4 * this.direction * dt;
        this.dy -= .3 * this.dy * dt - .4 * this.dy / Math.abs(this.dy) * dt;
        this.size += .005 * this.size * dt - .22 * dt + .18 * (1 - damp);
        this.damage -= 250 * this.damage * (1 - damp) - .004  * this.size * dt - this.damage * dt * .01 * this.size + this.damage * dt * .05;
        this.damage = Math.max(this.damage, .001);
        this.size = Math.max(this.size, .01);
        if(prob(this.size * .5 * this.damage)){
          this.x = enemy.hitbox.cx - this.w * .5;
          this.y = enemy.hitbox.cy - this.h * .5;
        }
      }
    });
    this.dy += 0.3 * dt;
    this.damage -= this.damage * damp;
    this.dx -= damp * this.dx * .15;
    this.dy -= damp * this.dy > 0 ? 0.05 : -0.05;
    if (this.y >= canvas.height) {
      this.dy *= -0.8;
      this.dx *= 0.8;
      this.size *= .9;
    }
    if (Math.abs(this.dx) < .001 || this.size < .1) {
      // this.frames <= 0 && console.log('out of frames');
      // Math.abs(this.dx) < .001 && console.log('too slow');
      // this.size < .1 && console.log('too small');
      // this.damage < .001 && console.log('too little damage');
      return this.destroy();
    }
    this.w = this.h = this.size;
    this.rotation = this.rotation.moveTowardsTheta(getTheta(this.dx, this.dy), .01 * dt);
  }
}