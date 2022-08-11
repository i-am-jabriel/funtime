import { Atlas } from "../Atlas.js";
import Enemy from "../Enemy.js";
import { canvas, camelCaser, Range, prob, players, rubberBand, applyOverTime, lerp, wait, getThetaFromDirections } from "../helper.js";
import { Particle } from "../Particle.js";
import Spike from "./Demon/Spike.js";

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
    this.w = 275;
    this.h = 275;
    this.weight = 4;
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
    // this.actionRate = .1;
    // this.actionRate = .8;
    this.actionRate = 8;
    this.attacks = ['swing', 'stomp', 'jump','dive','run', ...Array.from(new Array(10) ,() => 'dive')];
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
        frameRate: .2,
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
        frameX: -1,
        frames: 4,
        frameRate: .07,
        transition: 'idle',
        onEnterFrame: {
          3: async () => {
            this.pauseAnimation(2000);
            await wait(250);
            this.animationPaused && Spike.spawn(this);
          }
        },
      },
      swing: {
        animation: 'demonBossAttack2',
        frames: 8,
        transition: 'idle',
        frameRate: .09,
        onEnterFrame: {
          2: () => this.pauseAnimation(300),
          5: () => this.aoeAttack(-125, this.hitbox.h * .1, this.hitbox.w * .75, this.hitbox.h * 1.25, 1.5, players),
          6: () => this.pauseAnimation(250),
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
              this.x += dt * (this.hitbox.cx > mario.hitbox.cx ? -1 : 1) * 2;
              this.y -= (.1 + (.4 * ((1 - x) ** 1.2) )) * dt * 10;
              this.gravityForce = this.gravityForce.moveTowards(0, this.gravityForce * (.15 + x * .35) * dt * 10);
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
          this.aoeAttack(0, this.hitbox.h * .25, this.hitbox.w, this.hitbox.h * .75, 1.5, players);
          this.aoeAttack(0, this.hitbox.h * .45, this.hitbox.w * 2.25, this.hitbox.h * .55, 1, players);
          Particle.spawn('basicExplosion', this.hitbox.cx, this.hitbox.cy + this.hitbox.h * .35);
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
            this.attack = rubberBand(500, (x, dt) => {
              this.scaleY = lerp(1, .7, x ** .1);
              this.x += this.direction * .5 * dt * x;
              this.y += this.direction * .3 * dt * (1-x);
            }, () => {
              const endPos = this.x - 500 * this.direction, startPos = this.x;
              this.attack =  applyOverTime(1300, x => {
                x.between(.25, .94) && this.aoeAttack(-20, this.hitbox.h * .1, this.hitbox.w * .75, this.hitbox.h * .8 , .25, players);
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
    if(this.animation === 'idle' && !this.turning) {
      const direction = this.hitbox.cx < mario.hitbox.cx ? -1 : 1;
      if(this.direction !== direction){
        const start = this.x, end = start - direction * (this.cx - this.hitbox.cx);
        this.turning = applyOverTime(400 * this.weight * .5 + 50, x => {
          this.scaleX = lerp(.6, 1, Math.abs(x - .5) * 2);
          if(x >= .5) this.direction = direction * 1;
          this.x = lerp(start, end, x);
        }, () => {
          // this.direction = direction * -1;
          this.turning = null;
        })
      }
    }
    const deltaSize = dt * this.breathe.direction * (.2 + .8 * Math.abs(.5 - this.breathe.vMax));
    this.breathe.value += deltaSize;
    if(this.breathe.vMax === 1 || this.breathe.vMax === 0){
      this.breathe.direction *= -1;
    }
    this.h = this.originalH + this.breathe.value;
    if(this.breathe.direction === -1) this.y -= deltaSize;

    if(this.isOffstage && !this.inAnimation('jump','jumpWait','dive')){
      this.chargeToCenter();
    }
    if(this.animation === 'run'){
      // this.x = this.x.moveTowards(canvas.width * .2 - this.w * .5, this.speed * dt * 100);
      let direction = canvas.width * .5 - this.hitbox.cx > 0 || -1;
      this.x += this.speed * 375 * dt * direction / (this.weight * .25);
      this.direction = direction * -1;
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

Boss.atlas.fetchJsonAddImages('./../img/bosses.json', Boss.img, str => camelCaser(str.replace(/^attack\d+_(\d+_*)*\d*/i,''), ' _'))
  .then(()=>{
    const sizeMap = {
      demon: 96,
      ooze: 96,
      mage: 64
    }
    const sizeList = Object.keys(sizeMap);
    const sizeRegExpList = sizeList.map(x => new RegExp(x, 'i'));
    const getSize = (name, img, width = true) => sizeMap[sizeList.find((x, i) => name.match(sizeRegExpList[i]))] || img[width ? 'width' : 'height'];
    Object.keys(Boss.atlas.images).forEach(img => {
      // Boss.atlas.images[img].frameW = img.match(/mage/i) ? 64 : 96;
      // Boss.atlas.images[img].frameH = img.match(/mage/i) ? 64 : 96;
      Boss.atlas.images[img].frameW = getSize(img, Boss.atlas.images[img]);
      Boss.atlas.images[img].frameH = getSize(img, Boss.atlas.images[img], false);
      Boss.atlas.images[img].frameCountX = Boss.atlas.images[img].width / Boss.atlas.images[img].frameW;
    })
  });
// fetch('./../img/bosses.json')
//   .then(res => res.json())
//   .then(bossJson => {
//     Boss.atlas.addImagesFromJson(bossJson, Boss.img, str => camelCaser(str.replace(/^attack\d+_(\d+_*)*\d*/i,''), ' _'));
//     
//   });
