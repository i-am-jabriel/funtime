import { canvas, debug, context as mainContext, enemies, isColliding, prob, Random, applyOverTime, updateScore, lerp } from "./helper.js";

export default class StageObject {
  hitboxOffset = 1;
  gravityForce = 0;
  gravityRate = 0.05;
  frameCount = 0;
  frameRate = .14;
  lastFrame = -1;
  _direction = 1
  get direction() { return this._direction * (this.inverseDirection ? -1 : 1)};
  set direction(value) { this._direction = value * (this.inverseDirection ? -1 : 1); }
  get canBeAttacked() { return !this.intangible && this.hitBoxOffset !== 0; }
  get hitbox() {
    const currentAnimation = this.currentAnimation;
    if(!this.animations || !currentAnimation) return this;
    if (this._hitbox) return this._hitbox;
    const hitboxOffset = currentAnimation.hitboxOffset || this.hitboxOffset || 0;
    const width = this.w * (this.scaleX || 1);
    const height = this.h * (this.scaleY || 1);
    const xOffset = width * (currentAnimation.hitboxXOffset || this.hitboxXOffset || 0) * this.direction;
    const yOffset = height * (currentAnimation.hitboxYOffset || this.hitboxYOffset || 0);
    return Object.assign(this._hitbox = {
      x: this.x + width * hitboxOffset * 0.5 + xOffset,
      y: this.y + height * hitboxOffset * 0.5 + yOffset,
      w: width - width * hitboxOffset,
      h: height - height * hitboxOffset
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
  startAnimation(animation, cancelled) {
    if(!this.animations?.[animation])return;
    if(this.animationPaused) {
      clearTimeout(this.animationPaused);
      this.animationPaused = null;
    }
    this.currentAnimation.onExit?.(cancelled);
    this.animation = animation;
    this.frameCount = 0;
    this.lastFrame = -1;
  }
  draw(dt){
    this._hitbox = null;
    this.onEnterFrame?.(dt);
    this.hasGravity && this.gravity(dt);
    const context = this.context || mainContext;
    const currentAnimation = this.currentAnimation;
    // let x = 0, y = 0,frameX = 0, frameY = 0, 
    //   frameW = currentAnimation?.frameW || this.frameW,
    //   frameH = currentAnimation?.frameH || this.frameH,
    //   frameCountX = currentAnimation?.frameCountX || this.frameCountX,
    //   frameRate = currentAnimation?.frameRate || this.frameRate || .15;
    const frameData = Object.assign({x: 0, y: 0, frameX: 0, frameY: 0, frameW: 0, frameH: 0, frame:0}, 
      this.objectFromKeys('frameCountX', 'frameW', 'frameH', 'frameRate'),
      currentAnimation);
    currentAnimation?.onEveryFrame?.(dt);
    if(debug){
      if(this.hitbox && this.name){
        context.fillStyle = "rgba(255, 255, 0, 0.1)";
        context.fillRect(this.hitbox.x, this.hitbox.y, this.hitbox.w, this.hitbox.h);
      }
      if(this.debugAoe?.length){
        const alpha = lerp(.25, .01, (((this.debugAoe.length - 1) / 12) ** 0.45).clamp(0, 1));
        this.debugAoe.forEach(aoe => {
          // const alpha = this.name !== 'mario' ? '.2' : '.01'
          context.fillStyle = aoe.hit ? `rgba(0,255,0, ${alpha})` : `rgba(255, 0, 255, ${alpha})`;
          context.fillRect(aoe.x, aoe.y, aoe.w, aoe.h);
        });
      }
    }
    if(this.intangible){
      this.intangibleTimer ||= new Range(0, 2);
      this.intangibleTimer.value += dt * .1;
      if(this.intangibleTimer.value >= 1) this.intangibleTimer.value %= 1;
      if(this.intangibleTimer.value > .5) return;
    }
    if(this.atlas && (this.atlas.unpacked || this.atlasUnpacked)) {
      const ai = this.atlas.images[currentAnimation.animation];
      if(!ai) return prob(5) && console.warn('invalid animation', this.name, currentAnimation.animation);
      /*if(ai.x) x = ai.x;
      if(ai.y) y = ai.y;
      if(ai.frameH) frameH = ai.frameH;
      if(ai.frameW) frameW = ai.frameW;
      if(ai.frameCountX) frameCountX = ai.frameCountX;
      if(ai.frameRate) frameRate = ai.frameRate;*/
      Object.assign(frameData, ai);
    }
    if(this.animations){
      if(!this.animationPaused) this.frameCount += dt * frameData.frameRate;
      frameData.frame = Math.floor(this.frameCount);
      if (frameData.frame > this.lastFrame) {
        for (let i = this.lastFrame + 1; i <= frameData.frame; i++) {
          currentAnimation.onEnterFrame?.[i]?.();
        }
        this.lastFrame = frameData.frame;
      }
      if (this.frameCount >= currentAnimation.frames) {
        let transition = currentAnimation.transition;
        if(typeof transition === 'function') transition = transition(this);
        if(transition)
          this.startAnimation(transition);
        else {
          this.frameCount %= currentAnimation.frames;
          this.lastFrame = -1;
        }
      }
      frameData.frame = Math.max(Math.floor(this.frameCount),0);
      if(currentAnimation.animations && this.atlas){
        const ai = this.atlas.images[currentAnimation.animations[frameData.frame]];
        if(!ai) return prob(5) && console.warn('invalid animation', this.name, currentAnimation.animations[frameData.frame], frameData.frame);
        Object.assign(frameData, ai, { frameW: ai.width, frameH: ai.height });
      }
      if(frameData.frameCountX){
        frameData.frameX += (currentAnimation.startX || 0) + frameData.frame;
        let offsetY = frameData.frameX < frameData.frameCountX - 1 ? 0 : Math.floor(frameData.frameX / frameData.frameCountX);
        frameData.frameY += (currentAnimation.startY || 0) + offsetY;
        frameData.frameX %= frameData.frameCountX;
      }
    }
    context.save();
    const width = this.w * (this.scaleX || 1), halfW = width * .5;
    const height = this.h * (this.scaleY || 1), halfH = height * .5;
    context.translate(this.x + halfW, this.y + halfH);
    // context.translate(this.x,)
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
    // this.name && prob(3) && console.log(frameData)
    // if(Object.values(frameData).some(x => isNaN(x))){
    //   console.warn(frameData, 'frame', frame)
    //   debugger;
    // }
    if(this.img) 
      context.drawImage(this.img, frameData.x + frameData.frameX * frameData.frameW, frameData.y + frameData.frameY * frameData.frameH, frameData.frameW, frameData.frameH, -halfW, -halfH, width, height);
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
    let hitbox = x;
    if(Number(x) === x) {
      this._hitbox = null;
      hitbox = {
        x: this.hitbox.cx + this.direction * x - w * .5,
        y: this.hitbox.cy + y - h * .5,
        w,
        h
      },
      hitbox.cx = hitbox.x + hitbox.w * .5;
      hitbox.cy = hitbox.y + hitbox.y * .5;
  } else {
      damage = y;
      targets = w || enemies;
    }
    const hit = !!targets.filter((enemy) => enemy.canBeAttacked && isColliding(hitbox, enemy.hitbox || enemy) && enemy.takeDamage(this, damage, hitbox)).length;
    if(debug) {
      // (this.debugAoe||=[]).push(hitbox);
      !this.debugAoe && (this.debugAoe = []);
      this.debugAoe.push(hitbox);
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
    const height = this.h * (this.scaleY || 1);
    if (this.y >= canvas.height - height && this.gravityForce >= 0) {
      this.y = canvas.height - height;
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
    return Math.atan2(this.hitbox.cy - target.hitbox?.cy || target.cy, this.hitbox.cx - target.hitbox?.cy || target.cy);  
  }
  pauseAnimation(time) {
    if(this.animationPaused) clearTimeout(this.animationPaused);
    return new Promise(res => this.animationPaused = setTimeout(() => this.animationPaused = null || res(), time))
  }
  async takeDamage(attacker, damage, source) {
    if(!this.health) return;
    this.health.value -= damage;
    if(this.damageNumber){
      this.damageNumber.reset(this.cx, this.cy);
      clearTimeout(this.damageNumber.timer);
    } else {
      if(!StageObject.DamageNumber) {
        const DamageNumber = await import('./DamageNumber.js');
        StageObject.DamageNumber = DamageNumber.default;
      }
      this.damageNumber = new StageObject.DamageNumber(damage, this.cx, this.cy);
      this.damageNumber.stagger = 0;
    }
    this.damageNumber.value += damage;
    this.damageNumber.text = this.damageNumber.value.between(0, 1) ? this.damageNumber.value.toFixed(1) : Math.round(this.damageNumber.value);
    const weight = 4 / (this.weight ** .6);
    if(prob(this.damageNumber.stagger += damage * weight * .1 )){
      this.damageNumber.stagger = 0;
      if(this.animation !== 'hurt') this.startAnimation('hurt', true);
    }
    if(this.hasGravity && (this.weight < 1 || !(Math.ceil(this.damageNumber.stagger) % Math.round(7 * this.weight).clamp(0, 20)))){
      this.damageNumber.stagger++;
      // TODO: fix hitbox sourcing angels
      // const theta = attacker.rotation || this.getRotation(source || attacker);
      const theta = attacker.rotation || this.getRotation(attacker);
      const time = (Random.range(40, 70) * damage * weight) ** .5 + Random.range(80, 200) + 60 * weight + 100;
      const forceX = damage * .07 * Math.cos(theta) * weight;
      const forceY = damage * .09 * Math.sin(theta) * weight - Random.range(.004, .006)
      applyOverTime(time, (x, dt) => {
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
}