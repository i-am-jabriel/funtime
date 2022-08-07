import { canvas, debug, context, enemies, isColliding, prob } from "./helper.js";

export default class StageObject {
  hitboxOffset = 1;
  gravityForce = 0;
  gravityRate = 0.05;
  frameCount = -1;
  frameRate = .14;
  lastFrame = -1;
  _direction = 1
  get direction() { return this._direction * (this.inverseDirection ? -1 : 1)};
  set direction(value) { this._direction = value; }
  get hitbox() {
    const currentAnimation = this.currentAnimation;
    if(!this.animations || !currentAnimation) return this;
    if (this._hitbox) return this._hitbox;
    const hitboxOffset = currentAnimation.hitboxOffset || this.hitboxOffset || 0;
    const xOffset = this.w * (currentAnimation.hitboxXOffset || this.hitboxXOffset || 0) * this.direction;
    const yOffset = this.h * (currentAnimation.hitboxYOffset || this.hitboxYOffset || 0);
    return Object.assign(this._hitbox = {
      x: this.x + this.w * hitboxOffset * 0.5 + xOffset,
      y: this.y + this.h * hitboxOffset * 0.5 + yOffset,
      w: this.w - this.w * hitboxOffset,
      h: this.h - this.h * hitboxOffset
    },{
      cx: this._hitbox.x + this._hitbox.w * .5,
      cy: this._hitbox.y + this._hitbox.h * .5
    });
  }
  get currentAnimation(){ return this.animations && (this.animations[this.animation] || this.animations['idle']); }
  get cx() {
    return this.hitbox.x + this.hitbox.w * 0.5;
  }
  get cy() {
    return this.hitbox.y + this.hitbox.h * 0.5;
  }
  get isOffstage(){
    return !isColliding(canvas, this.hitbox)
  }
  inAnimation(...args) {
    return args.includes(this.animation);
  }
  startAnimation(animation) {
    if(!this.animations?.[animation])return;
    this.animation = animation;
    this.frameCount = 0;
    this.lastFrame = -1;
  }
  draw(dt){
    this._hitbox = null;
    this.onEnterFrame?.(dt);
    this.hasGravity && this.gravity(dt);
    const currentAnimation = this.currentAnimation;
    let x = 0, y = 0,frameX = 0, frameY = 0, 
      frameW = currentAnimation?.frameW || this.frameW,
      frameH = currentAnimation?.frameH || this.frameH,
      frameCountX = currentAnimation?.frameCountX || this.frameCountX,
      frameRate = currentAnimation?.frameRate || this.frameRate || .15;
    if(this.atlas && (this.atlas.unpacked || this.atlasUnpacked)) {
      const ai = this.atlas.images[currentAnimation.animation];
      if(!ai) return prob(5) && console.warn('invalid animation', this.atlas.images);
      if(ai.x) x = ai.x;
      if(ai.y) y = ai.y;
      if(ai.frameH) frameH = ai.frameH;
      if(ai.frameW) frameW = ai.frameW;
      if(ai.frameCountX) frameCountX = ai.frameCountX;
      if(ai.frameRate) frameRate = ai.frameRate;
    }
    if(this.animations){
      if(!this.animationPaused) this.frameCount += dt * frameRate;
      let frame = Math.floor(this.frameCount);
      if (frame > this.lastFrame) {
        for (let i = this.lastFrame + 1; i <= frame; i++) {
          currentAnimation.onEnterFrame?.[i]?.();
        }
        this.lastFrame = frame;
      }
      if (this.frameCount >= currentAnimation.frames) {
        let transition = currentAnimation.transition;
        if(typeof transition === 'function') transition = transition();
        if(transition)
          this.startAnimation(transition);
        else {
          this.frameCount %= currentAnimation.frames;
          this.lastFrame = -1;
        }
      }
      frame = Math.floor(this.frameCount);
      frameX += (currentAnimation.startX || 0) + frame;
      if(frameCountX){
        let offsetY = frameX < frameCountX - 1 ? 0 : Math.floor(frameX / frameCountX);
        frameY += (currentAnimation.startY || 0) + offsetY;
        frameX %= frameCountX;
      }
    }
    if(debug){
      if(this.hitbox && this.name){
        context.fillStyle = "rgba(255, 255, 0, 0.1)";
        context.fillRect(this.hitbox.x, this.hitbox.y, this.hitbox.w, this.hitbox.h);
      }
      if(this.debugAoe?.length){
        this.debugAoe.forEach(aoe => {
          const alpha = this.name !== 'mario' ? '.2' : '.01'
          context.fillStyle = aoe.hit ? `rgba(0,255,0, ${alpha})` : `rgba(255, 0, 255, ${alpha})`;
          context.fillRect(aoe.x, aoe.y, aoe.w, aoe.h);
        });
      }
    }
    context.save();
    const width = this.w * (this.scaleX || 1), halfW = width * .5;
    const height = this.h * (this.scaleY || 1), halfH = height * .5;
    this.owner && console.log(width, height, frameCountX, frameX, frameY, frameW, frameH, frameRate);
    context.translate(this.x + halfW, this.y + halfH);
    context.fillStyle = this.color;
    if(this.renderMethod === 'rect') context.fillRect(-halfW, -halfH, width, height);
    if(this.renderMethod === 'circle') {
      context.beginPath();
      context.arc(-halfW, -halfH, width, 0, Math.PI * 2);
      context.fill();
    }
    context.scale(this.direction, 1);
    if(this.rotation)
      context.rotate(this.rotation);
    if(this.img) 
      context.drawImage(this.img, x + frameX * frameW, y + frameY * frameH, frameW, frameH, -halfW, -halfH, width, height);
    if(this.text) {
      context.textAlign = 'center';
      context.font = `${this.fontSize}px ${this.font}`;
      context.fillStyle = this.color;
      context.fillText(this.text, -halfW, -halfH, width);
      if(this.stroke){
        context.strokeStyle = this.stroke;
        context.font = `${this.font} ${this.fontSize * 1.5}px`;
        context.strokeText(this.text, -halfW, -halfH, width);
      }
    }
    context.restore();
  }
  aoeAttack(x, y, w, h, damage, targets = enemies) {
    const hitbox = w ? {x: this.hitbox.cx + this.direction * x + (this.direction === 1 ? -w * .5 - this.hitbox.w * .5  : -w * .5 + this.hitbox.w * .5), y: this.hitbox.cy + y - h * .5, w, h} : x;
    if(!w) damage = y;
    const hit = !!targets.filter((enemy) => isColliding(hitbox, enemy.hitbox || enemy) && enemy.takeDamage(this, damage)).length;
    if(debug) {
      (this.debugAoe||=[]).push(hitbox);
      hitbox.hit = hit;
      setTimeout(() => { 
        const index = this.debugAoe.indexOf(hitbox);
        if(index !== -1) this.debugAoe.splice(index, 1);
      }, 500);
    }
    return hit;
  }
  gravity(dt) {
    // if mario is below the floor set him to the floor
    if (this.y >= canvas.height - this.h && this.gravityForce >= 0) {
      this.y = canvas.height - this.h;
      if (this.animation === "wallSlide") this.direction *= -1;
      if (this.inAnimation('airborne', 'wallSlide')) this.startAnimation("land");
      this.isGrounded = true;
      this.canJump = true;
      this.gravityForce = 0;
      this.doubleJump = true;
    } else {
      if(this.inAnimation('run','idle')) this.startAnimation('airborne');
      this.gravityForce += this.gravityRate * dt;
      this.isGrounded = false;
      this.canJump = this.isOnWall;
      this.y += this.gravityForce * dt;
    }
    this.wallCollision?.(dt);
  }
  getRotation(target){
    return Math.atan2(this.cy - target.cy, this.cx - target.cx);  
  }
}