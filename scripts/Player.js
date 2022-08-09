import { canvas, updateScore, isColliding, coin, coinSFX, applyOverTime, Random, lerp, wait, Range } from './helper.js';
import StageObject from './StageObject.js';
import Fireball from './Fireball.js';
import HUD from './UI/HUD.js';

export class Player extends StageObject{
  x = 200;
  y = 200;
  w = 55;
  h = 75;
  hasGravity = true;
  drawX = 2;
  drawY = 4;
  weight = .3;
  health = new Range(-1, -1);
  name = 'mario';
  hitboxOffset = 0.3;
  turbo = false;
  direction = 1;
  gravityForce = 0;
  color = 'rgba(255, 100, 0, 0.05)';
  speed = 1.9;
  renderMethod = 'string';
  // explosive force of jump
  jumpPower = new Range(0, 8.8, 0);
  // how fast it tapers (bigger = faster)
  jumpDamp = .16;
  up = false;
  down = false;
  left = false;
  right = false;
  isOnWall = false;
  doubleJump = true;
  canJump = true;
  // current jump velocity
  animation = 'idle';
  canFireball = true;
  wallSlideJumpDamp = 0.12;
  wallSlideJumpFlatDamp = 0.08;
  wallSlideDamp = 0.05;
  wallSlideJumpMomentumRatio = 0.15;
  isGrounded = false;
  frameW = 50;
  frameH = 37;
  frameCountX = 7;
  animations = {
    idle: {
      startX: 0,
      startY: 0,
      frames: 4,
      hitboxOffset: 0.35,
      hitboxYOffset: 0.1
    },
    run: {
      startX: 1,
      startY: 1,
      frames: 6,
      hitboxOffset: 0.5,
      hitboxYOffset: 0.1
    },
    jump: {
      startX: 0,
      startY: 2,
      frames: 4,
      hitboxOffset: 0.5,
      transition: 'airborne'
    },
    airborne: {
      startX: 1,
      startY: 3,
      frames: 2,
      hitboxOffset: 0.45
    },
    doubleJump: {
      startX: 2,
      startY: 2,
      frames: 8,
      transition: 'airborne',
      hitboxOffset: 0.8
    },
    land: {
      startX: 0,
      startY: 2,
      frames: 2,
      transition: 'idle',
      hitboxOffset: 0.65,
      hitboxYOffset: 0.05
    },
    slide: {
      startX: 3,
      startY: 3,
      frames: 5,
      transition: 'run',
      hitboxOffset: 0.8,
      hitboxYOffset: 0.3
    },
    wallSlide: {
      startX: 2,
      startY: 11,
      frames: 2,
      hitboxOffset: 0.6
    },
    crouch: {
      startX: 4,
      startY: 0,
      frames: 4,
      hitboxOffset: .7,
      hitboxYOffset: .35,
      tangible: false,
      onEnterFrame: {
        0: () => {
          if(!this.animations.crouch.tangible) 
            this.attack = applyOverTime(500, x => this.animations.crouch.hitboxOffset = lerp(1, .72, x ** 4))
          this.animations.crouch.tangible = true;
        }
      },
      onExit: () => this.animations.crouch.tangible = false || this.attack?.stop?.() || (this.attack = null)
    },
    standup: {
      startX: 6,
      startY: 0,
      frames: 3,
      hitboxOffset: 0.75,
      hitboxYOffset: 0.3,
      transition: 'idle'
    },
    swing: {
      startX: 4,
      startY: 13,
      frames: 5,
      frameRate: .2,
      hitboxXOffset: -.3,
      hitboxYOffset: 0.2,
      hitboxOffset: .7,
      onEnterFrame: {
        0: () => {
          let force = .5 * this.direction;
          applyOverTime(300, (x, dt) => {
            if(this.left || this.right) this.x += force * ((1-x) ** 1.4) * dt;
            // this.gravityForce -= .001 * dt;
            this.gravityForce -=  this.gravityForce * .003 * dt * x;
            // if(this.jumpPower.value > .1) this.jumpPower.value -= this.jumpPower.value * .4 * dt;
            // else this.jumpPower.value = 0;
          });
          // this.gravityForce *= .99;
          // this.jumpPower.value *= .4;
        },
        2: () => {
          applyOverTime(125, (x, dt) => this.aoeAttack(40, -40, 125, 110, dt * Random.range(.06, .12)));
          // this.gravityForce *= .99;
        }
      },
      transition: 'idle'
    },
    fireball: {
      startX: 3,
      startY: 12,
      frames: 5,
      transition: 'idle',
      onEnterFrame: {
        0: () => this.canFireball = false,
        1: () => {
          Fireball.spawn(this, 11);
          setInterval(()=> this.canFireball = true, 750);
        }
      }
    },
    hurt: {
      startX: 3,
      startY: 8,
      frames: 4,
      transition: 'idle',
    }
  }
  constructor(){
    super();
    this.img = Player.img;
  }
  get canAttack(){
    return this.inAnimation('idle', 'run', 'slide', 'jump', 'airborne', 'crouch', 'doubleJump','land')
  }
  onEnterFrame(dt) {
    if ((!this.left && !this.right) || this.animation === 'crouch') {
      if (this.turboTimeout && !this.turbo) clearInterval(this.turboTimeout);
      this.moving = false;
      this.turboTimeout = null;
      this.turbo = false;
    } else {
      this.moving = true;
      if (!this.turboTimeout)
        this.turboTimeout = setTimeout(() => {
          this.turbo = true;
          this.turboTimeout = null;
        }, 1000);
    }
    if (this.jumping && !this.jump && !this.up) {
      this.jumping = false;
      if (this.animation === 'jump') this.startAnimation('airborne');
      this.jumpPower.value = 0;
    }
    if (this.moving && this.animation === 'idle') this.startAnimation('run');
    if (!this.moving && this.animation === 'run')
      this.startAnimation('idle');
    if (
      (this.up || this.jump) &&
      (this.canJump || this.jumping || this.wallJump || this.doubleJump) &&
      this.animation !== 'wallSlide'
    ) {
      if (!this.jumping && (this.canAttack || this.animation === 'swing')) {
        this.startAnimation(
          this.canJump || this.wallJump ? 'jump' : 'doubleJump'
        );
        if (this.animation === 'doubleJump'){
          this.doubleJump = false;
          this.gravityForce *= 0.3;
        }
        this.jumpPower.value = this.jumpPower.max;
        this.canJump = false;
        // this.jumping = setTimeout(()=> {
        //   this.jumping = false;
        // }, 1000);
        this.jumping = true;
      }
      if(this.inAnimation('jump', 'doubleJump','swing')){
        // let newForce = (Math.pow((100 - this.gravityForce * .4) / 100, this.jumpDamp) + .1) || .01;
        this.jumpPower.value -= this.jumpDamp * dt;
        this.y -= this.jumpPower.value * dt;
        this.gravityForce -= (1 / this.jumpDamp) * dt * .004;
      }
    } else if (this.jumping) {
      // this.gravityForce *= .2;
      this.jumping = false;
      // this.jumpPower.value = 0;
    }
    if (this.down) {
      if (!this.isGrounded) this.y += this.speed * dt;
      else if (this.turbo) {
        this.turbo = false;
        this.startAnimation('slide');
      } else if (!this.inAnimation('slide', 'swing','crouch','fireball')) {
          this.startAnimation('crouch');
      }
    }
    if (this.animation === 'crouch' && !this.down) {
      this.startAnimation('standup');
    }
    if (this.left) {
      if (this.moving) this.x -= this.speed * dt * (this.turbo ? 1.33 : 1);
      this.direction = -1;
    }
    if (this.right) {
      if (this.moving) this.x += this.speed * dt * (this.turbo ? 1.33 : 1);
      this.direction = 1;
    }
    if (this.animation === 'slide')
      this.x += this.speed * dt * this.direction;
    if (this.swing && this.canAttack ){
      this.startAnimation('swing');
    }
    if (this.fireball && this.canFireball && this.canAttack)
      this.startAnimation('fireball');

    // check if mario is colliding with the coin
    if (isColliding(mario, coin)) {
      // move the coin to a random place on the screen
      // Math.random() gives a random decimal betwen 0 - 1;
      coin.x = Math.random() * canvas.width;
      coin.y = Math.random() * canvas.height;
      // play the coin sound effect
      coinSFX.play();

      updateScore(1);
    }
  }
  wallCollision(dt) {
    let wall;
    if (this.x <= -this.w * 0.25) wall = -this.w * 0.25;
    if (this.x >= canvas.width - this.w * 0.75) wall = canvas.width - this.w * 0.75;
    if (wall) {
      this.x = wall;
      this.isOnWall = true;
      this.gravityForce -= this.wallSlideDamp * this.gravityForce * dt;
      if (this.jumpPower.value) {
        this.jumpPower.value -=
          this.wallSlideJumpFlatDamp * dt * this.jumpPower.value +
          this.wallSlideJumpDamp * dt;
        this.gravityForce -=
          this.jumpPower.value * dt * this.wallSlideJumpMomentumRatio;
        if (this.jumpPower.value < 0.1) this.jumpPower.value = 0;
      }
      if (!this.inAnimation('wallSlide', 'idle', 'run', 'land'))
        this.startAnimation('wallSlide');
    } else if (this.isOnWall) {
      this.canJump = true;
      this.isOnWall = false;
      this.wallJump = true;
      this.doubleJump = true;
      this.gravityForce *= 0.1;
      if (this.animation === 'wallSlide') this.startAnimation('airborne');
      setTimeout(() => (this.wallJump = false), 350);
    }
  }
  takeDamage(attacker,damage){
    console.log('ouch',attacker.name||attacker.constructor.name,'dealt',damage);
    StageObject.prototype.takeDamage.apply(this, arguments);
    this.startAnimation('hurt', true);
    this.intangible = true;
    (this.intangibleTimer ||= new Range(0, 2)).value = 0;
    wait(2500).then(() => this.intangible = false);
  }
};
Player.img = new Image();
Player.img.src = './img/adventurer-v1-5-Sheet.png';