import { updateScore, score, enemies, render, isColliding, Range} from './helper.js';
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
    this.maxSpeed = 2.4;
    this.health = new Range(0, 10, 10);
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
      
      if (mario.canBeAttacked && isColliding(this, mario.hitbox)) {
        // enemies.forEach(enemy => enemy.destroy());
        // const newEnemies = enemies.filter(n => n.chaseMethod !== 'float');
        // enemies.length = 0;
        // Array.prototype.push.apply(enemies, newEnemies);
        // const newRender = render.filter(n => n.chaseMethod !== 'float');
        // render.length = 0;
        // Array.prototype.push.apply(render, newRender);
        enemies.remove(this);
        render.remove(this);
        mario.takeDamage(this, .5);
        updateScore(-score);
      }
    }

    // context.fillStyle = this.color;
    // draw a square at the coin's position
    // context.fillRect(this.x, this.y, this.w, this.h);
  }
  destroy() {
    enemies.splice(enemies.indexOf(this), 1);
    render.splice(render.indexOf(this), 1);
  }
}