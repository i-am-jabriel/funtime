import { Atlas } from '../Atlas.js';
import { arrayFrom, camelCaser, createContext, doUntil, lerp, newImage, render, wait } from '../helper.js';
import StageObject from '../StageObject.js';

export default class HUD extends StageObject {
  static img = newImage('./../img/ui.png');
  static atlas = new Atlas();
  static rendering = false;
  static render = [];
  static draw(){
    if(HUD.rendering) return;
    HUD.rendering = true;
    doUntil(dt => {
      HUD.context?.clearRect(0, 0, HUD.context.canvas.width, HUD.context.canvas.width);
      return HUD.render.reduce((a, c) => {
        c.draw(dt);
        return c.updating || a;
    }, false), () => HUD.rendering = false
  });
  }
  static animations = {
    heartDamage: {
      frameRate: .25,
      animations: arrayFrom(0, 5, 'heartsBonusHeartDamage'),
      frames: 5,
      transition: function() {
        this.updating = false;
        this._frameCount = HUD.animations.heart.animations.lerpIndex(this.hpValue);
        return 'heart';
      }
    },
    heartHeal: {
      animations: arrayFrom(0, 5, 'heartsBonusHeartRecover'),
      frames: 6
    },
    heartFlash: {
      animation: 'heartsBonusHeartFlash0',
      frames: 1,
    },
    heart: {
      frameRate: 0,
      animations: ['heartsBonusHeartEmpty0','heartsBonusHeartDamage5','heartsBonusHeartUsed2', 'heartsBonusHeartDamage2', 'heartsBonusHeartDamage0'],
      frames: 5,
      onEnterFrame: { 0: function() {
        // console.log(this.index, this.frameCount, this.hpValue);
        this.frameCount = this._frameCount;
        // this.animationPaused = true;
        // HUD.draw();
      } }
    },
    energy: {

    }
  }
  static context = createContext();
  constructor(data){
    super(data);
    Object.assign(this.copyValues(HUD, 'animations', 'atlas', 'img', 'context'), data);
    HUD.render.push(this);
    // wait(400).then(()=>render.push(this));
  }
}

HUD.atlas.fetchJsonAddImages('./../img/ui.json', HUD.img, x => camelCaser(x.replace(/\/*png\/*/gi, ''), / .|_.|\/16x16\/.|\/32x32\/.|\/./gi))
window.HUD = HUD;


export class PlayerHUD {
  hearts = [];
  energy = [];
  constructor(player) {
    this.player = player;
    this.roundedHp = player.health.max;
    for(let i = 0; i < player.health.max; i++) this.hearts.push(new HUD({
      name: 'heart',
      animation: 'heart',
      h: 40,
      w: 40,
      x: 10 + 40 * i,
      y: 10,
      _frameCount: HUD.animations.heart.animations.length - 1,
      index: i,
      hpValue: 1
    }));

    for(let i = 0; i < player.energy.max; i++) this.energy.push(new HUD({
      name: 'energy',
      animation: 'energy',
      h: 20,
      w: 40,
      x: 10 + 40 * i,
      y: 60,
      index: i,
      value: 0,
      renderMethod: 'rect',
      color:'gold',
      img: null
    }));
    wait(100).then(HUD.draw);

    player.health.onValue.push(() => {
      const rounded = player.health.value.round(1 / HUD.animations.heart.animations.length);
      if(this.roundedHp === rounded) return;
      this.roundedHp = rounded;
      for(let i = 0; i < player.health.max; i++) {
        let value = i - player.health.value + 1;
        if(i.between(Math.floor(player.health.value - 1), Math.floor(player.health.value))) value = (player.health.value % Math.floor(this.player.health.value)) || 0;
        else value = 1 - value.clamp(0, 1);
        if(this.hearts[i].hpValue != value){ 
          console.log(i, value);
          this.hearts[i].hpValue = value;
          this.hearts[i].updating = true;
          this.hearts[i].startAnimation('heartDamage');
        }
      }
      HUD.draw();
    });
  }
}
window.HUD = HUD;