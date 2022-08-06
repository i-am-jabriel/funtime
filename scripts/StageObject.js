import { canvas, debug, context, enemies, isColliding, prob } from "./helper.js";

export default class StageObject {
  hitboxOffset = 1;
  gravityForce = 0;
  gravityRate = 0.05;
  frameCount = -1;
  frameRate = .14;
  lastFrame = -1;
  direction = 1;
  get hitbox() {
    const currentAnimation = this.currentAnimation;
    if(!this.animations || !currentAnimation) return this;
    if (this._hitbox) return this._hitbox;
    const hitboxOffset = currentAnimation.hitboxOffset || this.hitboxOffset || 0;
    const xOffset = this.w * (currentAnimation.hitboxXOffset || this.hitboxXOffset || 0) * this.direction;
    const yOffset = this.h * (currentAnimation.hitboxYOffset || this.hitboxYOffset || 0);
    return (this._hitbox = {
      x: this.x + this.w * hitboxOffset * 0.5 + xOffset,
      y: this.y + this.h * hitboxOffset * 0.5 + yOffset,
      w: this.w - this.w * hitboxOffset,
      h: this.h - this.h * hitboxOffset
    });
  }
  get currentAnimation(){ return this.animations && (this.animations[this.animation] || this.animations['idle']); }
  get cx() {
    return this.x + this.w * 0.5;
  }
  get cy() {
    return this.y + this.h * 0.5;
  }
  inAnimation(...args) {
    return args.includes(this.animation);
  }
  startAnimation(animation) {
    this.animation = animation;
    this.frameCount = 0;
    this.lastFrame = -1;
  }
  draw(dt){
    this._hitbox = null;
    this.onEnterFrame?.(dt);
    this.hasGravity && this.gravity(dt);
    let x = 0, y = 0,frameX = 0, frameY = 0, frameW = this.frameW, frameH = this.frameH, frameCountX = this.frameCountX;
    const currentAnimation = this.currentAnimation;
    if(this.atlas && this.atlas.unpacked) {
      const ai = this.atlas.images[currentAnimation.animation];
      if(!ai) return prob(5) && console.warn('invalid animation', this.atlas.images);
      x = ai.x;
      y = ai.y;
      frameH = ai.frameH;
      frameW = ai.frameW;
      frameCountX = ai.frameCountX;
    }
    if(this.animations){
      this.frameCount += dt * this.frameRate;
      let frame = Math.floor(this.frameCount);
      if (frame > this.lastFrame) {
        for (let i = this.lastFrame + 1; i <= frame; i++) {
          currentAnimation.onEnterFrame?.[i]?.();
        }
        this.lastFrame = frame;
      }
      if (this.frameCount >= currentAnimation.frames) {
        if (currentAnimation.transition)
        this.startAnimation(currentAnimation.transition);
        else {
          this.frameCount %= currentAnimation.frames;
          this.lastFrame = -1;
        }
      }
      frame = Math.floor(this.frameCount);
      frameX += (currentAnimation.startX || 0) + frame;
      let offsetY = frameX < frameCountX - 1 ? 0 : Math.floor(frameX / frameCountX);
      frameY += (currentAnimation.startY || 0) + offsetY;
      frameX %= frameCountX;
    }
    if(debug){
      if(this.hitbox && this.name){
        context.fillStyle = "rgba(255, 255, 0, 0.1)";
        context.fillRect(this.hitbox.x, this.hitbox.y, this.hitbox.w, this.hitbox.h);
      }
      if(this.debugAoe?.length){
        context.fillStyle = "rgba(255, 0, 255, 0.01)";
        this.debugAoe.forEach(aoe => context.fillRect(aoe.x, aoe.y, aoe.w, aoe.h));
      }
    }
    context.save();
    context.translate(this.x + this.w * 0.5, this.y + this.h * 0.5);
    context.fillStyle = this.color;
    if(this.renderMethod === 'rect') context.fillRect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);
    if(this.renderMethod === 'circle') {
      context.arc(-this.w * 0.5, -this.h * 0.5, this.w, 0, Math.PI * 2);
      context.fill();
    }
    context.scale(this.direction, 1);
    // if(this.img) context.drawImage(
    //   this.img,
    //   frameX * 50 - this.drawX * 0.25,
    //   frameY * 37,
    //   50 - this.drawX,
    //   37,
    //   -this.w * 0.5 - this.drawX,
    //   -this.h * 0.5 - this.drawY * 0.5,
    //   this.w,
    //   this.h
    // );
    // prob(5) && this.name === 'Demon' && console.log(this.name,'has image',!!this.img, x + frameX * frameW, y + frameY * frameH, frameW, frameY, -this.w * .5, -this.h * .5, this.w, this.h) || conso;
    if(this.img) 
      context.drawImage(this.img, x + frameX * frameW, y + frameY * frameH, frameW, frameH, -this.w * .5, -this.h * .5, this.w, this.h);
    if(this.text) {
      context.textAlign = 'center';
      context.font = `${this.fontSize}px ${this.font}`;
      context.fillStyle = this.color;
      context.fillText(this.text, -this.w * .5, -this.h * .5, this.w);
      if(this.stroke){
        context.strokeStyle = this.stroke;
        context.font = `${this.font} ${this.fontSize * 1.5}px`;
        context.strokeText(this.text, -this.w * .5, -this.h * .5, this.w);
      }
    }
    context.restore();
  }
  aoeAttack(x, y, w, h, damage) {
    const hitbox = w ? {x: this.cx + this.direction * x + (this.direction === 1 ? -w * .5 - this.w * .5  : -w * .5 + this.w * .5), y: this.cy + y - h * .5, w, h} : x;
    if(!w) damage = y;
    enemies.forEach((enemy) => isColliding(hitbox, enemy.hitbox || enemy) && enemy.takeDamage(this, damage));
    if(debug) {
      (this.debugAoe||=[]).push(hitbox);
      setTimeout(() => { 
        const index = this.debugAoe.indexOf(hitbox);
        if(index !== -1) this.debugAoe.splice(index, 1);
      }, 500);
    }
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