import { canvas, lerp, players, wait } from "../../helper.js";
import { Particle } from "../../Particle.js";

export default class Spike extends Particle{
  static async spawn(owner){
    const count = 12, start = owner.hitbox.cx - 50 * owner.realDirection, end = owner.hitbox.cx - 500 * owner.realDirection;
    for(let i = 0; i < count; i++){
      Particle.spawn('Spike', {
        owner,
        x: lerp(start, end, i / count),
        y: canvas.height - 25,
        w: 65,
        h: 50,
        frameW: 66,
        frameH: 27,
        frameCountX: 10,
        animation: 'spike',
        atlasUnpacked: true,
        // renderMethod: 'rect',
        color: 'red',
        frameRate: .015
      }, Spike);
      await wait(40 + i * 5 + (i ** 2) * 2);
    }

  }
  constructor(data){
    super(data);
  }

  onEnterFrame(dt){
    Particle.prototype.onEnterFrame.apply(this, arguments);
    this.frameRate += .001 * dt;
    this.h += 22 * this.frameRate * dt;
    this.y -= 22 * this.frameRate * dt;
    if(this.frameCount > 4 && !this.exploded){
      this.owner.aoeAttack(this, 1, players);
      this.exploded = true;
    }
  }
}