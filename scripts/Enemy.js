import DamageNumber from './DamageNumber.js';
import { updateScore, score, enemies, render, isColliding, Range, applyOverTime, Random, prob } from './helper.js';
import StageObject from './StageObject.js';
export default class Enemy extends StageObject {
  // when i create a new enemy run this code
  constructor() {
    super();
    enemies.push(this);
    render.push(this);
    let theta = Math.random() * Math.PI * 2;
    this.x = mario.x + 400 * Math.cos(theta);
    this.y = mario.y + 400 * Math.sin(theta);
    this.color = "pink";
    this.renderMethod = 'rect';
    this.chaseMethod = 'float';
    this.speed = 0.007;
    this.w = 18;
    this.h = 18;
    this.dx = 0;
    this.dy = 0;
    this.weight = 1;
    this.maxSpeed = 2.5;
    this.health = new Range(0, 50, 50);
    this.maxSpeedX = Math.random() * this.maxSpeed;
    this.maxSpeedY = this.maxSpeed - this.maxSpeedX;
  }
  onEnterFrame(dt) {
    // if playerx > enemyx enemyx += speed
    if(this.chaseMethod === 'float'){
      if (mario.cx > this.x) this.dx += this.speed * dt;
      if (mario.cx < this.x) this.dx -= this.speed * dt;
      if (mario.cy > this.y) this.dy += this.speed * dt;
      if (mario.cy < this.y) this.dy -= this.speed * dt;
      this.x += Math.max(Math.min(this.dx, this.maxSpeedX), -this.maxSpeedX) * dt;
      this.y += Math.max(Math.min(this.dy, this.maxSpeedY), -this.maxSpeedY) * dt;
      
      if (isColliding(this, mario.hitbox)) {
        // enemies.forEach(enemy => enemy.destroy());
        const newEnemies = enemies.filter(n => n.chaseMethod !== 'float');
        enemies.length = 0;
        Array.prototype.push.apply(enemies, newEnemies);
        const newRender = render.filter(n => n.chaseMethod !== 'float');
        render.length = 0;
        Array.prototype.push.apply(render, newRender);
        updateScore(-score);
      }
    }

    // context.fillStyle = this.color;
    // draw a square at the coin's position
    // context.fillRect(this.x, this.y, this.w, this.h);
  }
  takeDamage(attacker, damage) {
    if(this.health.min === -1) return;
    this.health.value -= damage;
    if(this.damageNumber){
      this.damageNumber.reset(this.cx, this.cy);
      clearTimeout(this.damageNumber.timer);
    } else {
      this.damageNumber = new DamageNumber(damage, this.cx, this.cy);
      this.damageNumber.stagger = 0;
    }
    this.damageNumber.value += damage;
    this.damageNumber.text = Math.ceil(this.damageNumber.value);
    if(prob(this.damageNumber.stagger += damage)){
      this.damageNumber.stagger = 0;
      this.startAnimation('hurt', true);
    }
    if(this.hasGravity && Math.floor(this.damageNumber.stagger) % 3 === 0){
      this.damageNumber.stagger++;
      const theta = attacker.rotation || this.getRotation(attacker);
      const weight = 1 / (this.weight ** .3);
      const time = (Random.range(40, 70) * damage * weight) ** .3 + Random.range(80, 200) + 60 * weight;
      applyOverTime(time, (x, dt) => {
        const forceX = damage * .06 * Math.cos(theta) / this.weight * (x * .5 + .5);
        const forceY = damage * .08 * Math.sin(theta) / this.weight * (x * .5 + .5) - Random.range(.003, .005);
        this.gravityForce -= this.gravityForce * dt * .0003 * x * weight;
        this.x += forceX * dt;
        this.y += forceY * dt;
      });
    }
    this.damageNumber.timer = setTimeout(() => {
      this.damageNumber = null;
    }, 250);
    if(this.health.vMax === 0){
      this.destroy();
      updateScore(5);
      return false;
    }
    return true;
  }
  destroy() {
    enemies.splice(enemies.indexOf(this), 1);
    render.splice(render.indexOf(this), 1);
  }
}