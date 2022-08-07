import { Atlas } from "./Atlas.js";
import Enemy from "./Enemy.js";
import { canvas, camelCaser, Range, prob, players, rubberBand, applyOverTime, lerp } from "./helper.js";
// import bossJson from '../img/bosses-0.json';

export default class Boss extends Enemy{
  static atlas = new Atlas();
  static img = new Image();
  constructor(name){
    super();
    this.img = Boss.img;
    this.atlas = Boss.atlas;
    this.health._value = this.health.max = -1;
    this.color = "rgba(255, 100, 0, 0.05)";
    this.renderMethod = null;
    this.hasGravity = true;
    this.x = canvas.width * .5;
    this.y = 0;
    this.w = 190;
    this.h = 190;
    this.originalH = this.h;
    this.breathe = new Range(0, 40);
    this.breathe.direction = 1;
    this.chaseMethod = null;
    this.animation = 'idle';
    this.name = 'Demon';
    this.hitboxOffset = .4;
    this.hitboxXOffset = .15;
    this.hitboxYOffset = .2;
    this.action = 0;
    this.actionRate = .8;
    this.actionRate = 8;
    this.attacks = ['swing', 'stomp','jump'];
    this.inverseDirection = true;
    this.animations = {
      idle: {
        animation: 'demonBoss',
        frames: 1,
        // hitboxXOffset: .10

      },
      hurt: {
        animation: 'demonBossHurt',
        frames: 4,
        transition: 'idle',
      },
      run: {
        animation: 'demonBossRun',
        frameRate: .3,
        frames: 6,
        transition: () => {
          if(this.hitbox.cx.between(canvas.w * .4, canvas.w * .6)){
            this.action = 0;
            return 'idle';
          }
        }
      },
      stomp: {
        animation: 'demonBossAttack1',
        frameX: -2,
        frames: 4,
        frameRate: .07,
        onEnterFrame: {
          3: () => this.stompPending = setTimeout(() => this.stompPending = null, 2000)
        },
        transition: () => {
          if(this.stompPending){
            this.frameCount = 3;
            return;
          }
          return 'idle';
        }
      },
      swing: {
        animation: 'demonBossAttack2',
        frames: 8,
        transition: 'idle',
        frameRate: .08,
        onEnterFrame: {
          2: () => this.animationPaused = true && setTimeout(() => this.animationPaused = false, 200),
          5: () => this.aoeAttack(-40, 0, 100, 120, 1, players),
          6: () => this.animationPaused = true && setTimeout(() => this.animationPaused = false, 200),
        }
      },
      jump: {
        animation: 'demonBossAttack3',
        frames: 8,
        transition: 'jumpWait',
        onEnterFrame: {
          0: () => rubberBand(300, x => this.scaleY = lerp(1, .5, x ** 0.4)),
          4: () => applyOverTime(300, (x, dt) => this.y -= 2 * x * dt),
          6: () => applyOverTime(500, (x,dt) => this.gravityForce -= this.gravityForce * .1 * dt)
        }
      },
      jumpWait: {
        animation: 'demonBossAttack3',
        frameX: 2,
        frames: 1,
        transition: () => this.isGrounded && 'idle'
      }
    }
  }
  onEnterFrame(dt){
    Enemy.prototype.onEnterFrame.call(this, dt);
    if(this.animation === 'idle') this.direction = this.hitbox.cx < mario.hitbox.cx ? 1 : -1;
    const deltaSize = dt * this.breathe.direction * (.2 + .8 * Math.abs(.5 - this.breathe.vMax));
    this.breathe.value += deltaSize;
    if(this.breathe.vMax === 1 || this.breathe.vMax === 0){
      this.breathe.direction *= -1;
    }
    this.h = this.originalH + this.breathe.value;
    if(this.breathe.direction === -1) this.y -= deltaSize;

    if(this.isOffstage){
      this.chargeToCenter();
    }
    if(this.animation === 'run'){
      // this.x = this.x.moveTowards(canvas.width * .2 - this.w * .5, this.speed * dt * 100);
      let direction = canvas.width * .5 - this.hitbox.cx > 0 || -1;
      this.x += this.speed * 350 * dt * direction / this.weight;
      this.direction = direction;
    }
    if(this.animation === 'idle' && prob(this.action += this.actionRate * dt))
      this.startAnimation(this.attacks.pick());
      this.action = 0;
  }
  startAnimation(animation){
    if((this.animation === 'run' && animation === 'hurt') || 
    (animation === 'hurt' && this.animation !== 'idle' && prob(10 / this.weight))) return;
    Enemy.prototype.startAnimation.call(this, animation)
  }
  chargeToCenter(){
    this.startAnimation('run');
  }
}
Boss.atlas.unpacked = true;
Boss.img.src = './../img/bosses.png';
window.Boss = Boss;

fetch('./../img/bosses.json')
  .then(res => res.json())
  .then(bossJson => {
    Boss.atlas.addImagesFromJson(bossJson, Boss.img, str => camelCaser(str.replace(/^attack\d+_(\d+_*)*\d*/i,''), true));
    Object.keys(Boss.atlas.images).forEach(img => {
      Boss.atlas.images[img].frameW = img.match(/mage/i) ? 64 : 96;
      Boss.atlas.images[img].frameH = img.match(/mage/i) ? 64 : 96;
      Boss.atlas.images[img].frameCountX = Boss.atlas.images[img].width / Boss.atlas.images[img].frameW;
    })
  });
