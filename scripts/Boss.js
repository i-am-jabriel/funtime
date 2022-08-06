import { Atlas } from "./Atlas.js";
import Enemy from "./Enemy.js";
import { canvas, camelCaser, Range } from "./helper.js";
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
    this.hasGravity = true;
    this.x = canvas.width * .5;
    this.y = 0;
    this.w = 160;
    this.h = 160;
    this.originalH = this.h;
    this.breathe = new Range(0, 40);
    this.breathe.direction = 1;
    this.chaseMethod = null;
    this.animation = 'idle';
    this.name = 'Demon';
    this.hitboxOffset = .4;
    this.hitboxXOffset = .15;
    this.hitboxYOffset = .2;
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
      }
    }
  }
  onEnterFrame(dt){
    Enemy.prototype.onEnterFrame.call(this, dt);
    const deltaSize = dt * this.breathe.direction * (.2 + .8 * Math.abs(.5 - this.breathe.vMax));
    this.breathe.value += deltaSize;
    if(this.breathe.vMax === 1 || this.breathe.vMax === 0){
      this.breathe.direction *= -1;
    }
    this.h = this.originalH + this.breathe.value;
    if(this.breathe.direction === -1) this.y -= deltaSize;
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
