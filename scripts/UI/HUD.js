import { Atlas } from '../Atlas.js';
import { arrayFrom, camelCaser, createContext, doUntil, prob, newImage, wait, context } from '../helper.js';
import StageObject from '../StageObject.js';

export default class HUD extends StageObject {
  static img = newImage('./../img/ui.png');
  static atlas = new Atlas();
  static rendering = false;
  static render = [];
  static context = createContext();
  static overlayContext = createContext();
  static clear(overlay){
    HUD.context?.clearRect(0, 0, HUD.context.canvas.width, HUD.context.canvas.width);
    overlay && HUD.overlayContext.clearRect(0, 0, HUD.overlayContext.canvas.width, HUD.overlayContext.canvas.height);
  }
  static refresh(dt){
      HUD.clear();
      const running = HUD.render.reduce((a, c) => {
          c.draw.call(c, dt);
          return c.updating || a;
      }, false);
      return running;
  }
  static draw(){
    if(HUD.rendering) return;
    HUD.rendering = true;
    if(HUD.refresh(0)) doUntil(HUD.refresh, () => HUD.rendering = false);
    else HUD.rendering = false;
  }
  static animations = {
    heartDamage: {
      frameRate: .25,
      animations: arrayFrom(0, 5, 'heartsBonusHeartDamage'),
      frames: 5,
      transition: function() {
        this._frameCount = HUD.animations.heart.animations.lerpIndex(this.value);
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
        this.updating = false;
      } }
    },
    energy: {
      animations: arrayFrom(3, 5, 'healthBarsSimpleFilled2'),
      frameRate: 0,
      onEnterFrame: {0: function(){
        this.frameCount = this.segment;
        this.mask = {x: 0, y: 0, r: this.value}
        HUD.draw();
      }}
    },
    energyBar: {
      animations: arrayFrom(3, 5, 'healthBarsSimpleEmpty'),
      frameRate: 0,
      onEnterFrame: {0: function(){
        this.frameCount = this.segment;
      }}

    }
  }
  constructor(data, addToRender = true){
    super(data);
    Object.assign(this.copyProperties(HUD, 'animations', 'atlas', 'img', 'context'), data);
    addToRender && HUD.render.push(this);
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
      x: 15 + 40 * i,
      y: 10,
      noHitbox: true,
      frameCount: HUD.animations.heart.animations.length - 1,
      index: i,
      value: 1,
    }));

    for(let i = 0; i < player.energy.max; i++) this.energy.push(new HUD({
      name: 'energy',
      animation: 'energy',
      h: 18,
      w: 61 + 5 * (i === 0 ),
      x: 15 + 60 * i - 2 * (i === 3),
      y: 50,
      index: i,
      noHitbox: true,
      // value: 0 + (i === 3 ? .5 : 0),
      value: 1,
      segment: i - (i > 1),
      bar: new HUD({
        name: 'energy bar',
        noHitbox: true,
        animation: 'energyBar',
        index: i,
        h: 18,
        w: 60 + 5 * (i === 0 ),
        x: 15 + 60 * i - 2 * (i === 3),
        y: 50,
        segment: i - (i > 1)
      }, false),
      // renderMethod: 'rect',
      color:'gold',
      // img: null,
      onEnterFrame: this.energyOnEnterFrame, 
    }));
    this.drawEnergyBarSeperators();
    wait(100).then(HUD.draw);

    player.health.onValue.push(() => {
      const rounded = player.health.value.round(1 / HUD.animations.heart.animations.length);
      if(this.roundedHp === rounded) return;
      this.roundedHp = rounded;
      for(let i = 0; i < player.health.max; i++) {
        let value = i - player.health.value + 1;
        if(i.between(Math.floor(player.health.value - 1), Math.floor(player.health.value))) value = (player.health.value % Math.floor(this.player.health.value)) || 0;
        else value = 1 - value.clamp(0, 1);
        if(this.hearts[i].value != value){ 
          this.hearts[i].value = value;
          this.hearts[i].updating = true;
          this.hearts[i]._frameCount = 0;
          this.hearts[i].startAnimation('heartDamage');
        }
      }
      HUD.draw();
    });

    player.energy.onValue.push(() => {
      if(this.energyValue === player.energy.value) return;
      this.energyValue = player.energy.value;
      for(let i = 0; i < player.energy.max; i++) {
        let value = i - player.energy.value + 1;
        if(i.between(Math.floor(player.energy.value - 1), Math.floor(player.energy.value))) value = (player.energy.value % Math.floor(this.player.energy.value)) || 0;
        else value = value.clamp(0, 1);
        if(this.energy[i].value != value){ 
          this.energy[i].value = value;
          this.energy[i].mask = {x: 0, y: 0, r: value};
          // console.log('updating energy', i, player.energy.value, this.energyValue)
        }
      }
      HUD.draw();
    })
  }
  energyOnEnterFrame(dt){
    this.bar.draw(dt);
  }
  drawEnergyBarSeperators(){
    for(let i = 0; i < this.energy.length - 1; i++){
      HUD.overlayContext.beginPath();
      HUD.overlayContext.moveTo(this.energy[i].x + this.energy[i].w, this.energy[i].y);
      HUD.overlayContext.lineTo(this.energy[i].x + this.energy[i].w, this.energy[i].y + this.energy[i].h * .9);
      HUD.overlayContext.stroke();
    }
  }
}
window.HUD = HUD;