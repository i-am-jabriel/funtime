import { Atlas } from "./Atlas.js";
import Enemy from "./Enemy.js";
import { canvas, camelCaser, Range, prob, players, rubberBand, applyOverTime, lerp } from "./helper.js";
import { Particle } from "./Particle.js";
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
    this.attacks = ['swing', 'stomp', 'jump','dive'];//, ...Array.from(new Array(10) ,() => 'dive')];
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
          if(this.hitbox.cx.between(canvas.w * .35, canvas.w * .65)){
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
          2: () => this.pauseAnimation(250),
          5: () => this.aoeAttack(-40, 0, 100, 120, 1, players),
          6: () => this.pauseAnimation(150),
        },
      },
      jump: {
        animation: 'demonBossAttack3',
        frames: 4,
        frameX: 0,
        frameRate: .12,
        transition: 'jumpWait',
        onEnterFrame: {
          0: () => {
            const startY = this.y, endY = startY + this.h;
            this.attack = [rubberBand(600, x => {
              this.scaleY = lerp(1, .5, x ** .25);
              this.y = lerp(startY, endY, x ** .25);
            })];
            this.pauseAnimation(200);
          },
          2: () => {
            this.animationPaused = true;
            this.attack.push(applyOverTime(1200, (x, dt) => {
              this.x += dt * (this.hitbox.cx > mario.hitbox.cx ? -1 : 1) * .1;
              this.y -= (.1 + (.4 * ((1 - x) ** 1.2) )) * dt;
              this.gravityForce = this.gravityForce.moveTowards(0, this.gravityForce * (.15 + x * .35) * dt);
            }, () => this.animationPaused = false));
          },
        },
        onExit: () => {
          this.attack?.forEach?.(attack => attack.running && attack.stop());
          this.attack = null;
          this.scaleY = 1;
        }
      },
      jumpWait: {
        animation: 'demonBossAttack3',
        frameX: 3,
        frames: 3,
        frameRate: .03,
        onEveryFrame: (dt) => {
          if(this.animationPaused) return this.frameCount += (dt * .1) % 3;
          this.x += dt * (this.hitbox.cx > mario.hitbox.cx ? -1 : 1) * .4;
          if(!this.isGrounded) return;
          this._hitbox = null
          this.aoeAttack(0, this.hitbox.h * .5, this.hitbox.w * 2.25, this.hitbox.h * .5, 1, players);
          Particle.spawn('basicExplosion', this.hitbox.cx, this.hitbox.cy + this.hitbox.h * .3)
          this.pauseAnimation(300)
            .then(() => this.startAnimation('idle'));
          
        }
      },
      dive: {
        animation: 'demonBossAttack1',
        frameX: -4,
        frames: 4,
        transition: 'idle',
        onEnterFrame: {
          2: () => {
            this.animationPaused = true;
            this.attack = rubberBand(300, x => {
              this.scaleY = lerp(1, .75, x ** .1);
            }, () => {
              const endPos = this.x - 400 * this.direction, startPos = this.x;
              this.attack =  applyOverTime(1200, x => {
                x.between(.25, .94) && this.aoeAttack(-20, 0, this.hitbox.w * .75, this.hitbox.h , .5, players);
                this.x = lerp(startPos, endPos + 100 * this.direction * x, (x ** 3.2));
              },()=> this.attack = null || (this.animationPaused = false));
            });
          }
        },
        onExit: cancelled => {
          this.scaleY = 1;
          if(this.attack?.running && cancelled){
            this.animationPaused = false;
            this.attack.stop();
          }
        }
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

    if(this.isOffstage && !this.inAnimation('jump','jumpWait')){
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
    Enemy.prototype.startAnimation.apply(this, arguments)
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
    Boss.atlas.addImagesFromJson(bossJson, Boss.img, str => camelCaser(str.replace(/^attack\d+_(\d+_*)*\d*/i,''), ' _'));
    Object.keys(Boss.atlas.images).forEach(img => {
      Boss.atlas.images[img].frameW = img.match(/mage/i) ? 64 : 96;
      Boss.atlas.images[img].frameH = img.match(/mage/i) ? 64 : 96;
      Boss.atlas.images[img].frameCountX = Boss.atlas.images[img].width / Boss.atlas.images[img].frameW;
    })
  });
