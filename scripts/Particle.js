import { Atlas } from "./Atlas.js";
import { arrayFrom, camelCaser, prob, render } from "./helper.js";
import StageObject from "./StageObject.js";

export class Particle extends StageObject{
  static atlas = new Atlas();
  static img = new Image();

  constructor(data) { 
    super();
    Object.assign(this, data);
  }
  static animations = {
    basicExplosion: {
      animations: arrayFrom(1, 10, 'explosionBasicexplosion'),
      frames: 10,
      frameRate: .25,
      transition: particle => particle.destroy() || (particle.w = 0),
      data: {
        lastFrame: 0,
        w: 150,
        h: 50,
        onEnterFrame(dt){
          this.w += 2 * dt;
          this.h += 1 * dt;
          this.y -= .5 * dt;
          this.x -= 1 * dt;
        }
        // renderMethod: 'rect',
        // color: 'blue'
      }
    }
  }

  onEnterFrame(dt){
    if(this.frames && (this.frames -= dt) <= 0) this.destroy();
  }
  destroy() {
    render.splice(render.indexOf(this), 1);
  }

  static spawn(name, x, y){
    let particle = new Particle({
      name,
      x,
      y,
      img: Particle.img,
      atlas: Particle.atlas,
      animations: Particle.animations,
      animation: name,
      ...(Particle.animations[name]?.data || {})
    });
    particle.x -= particle.w * .5;
    particle.y -= particle.h * .5;
    // if(prob(1)) particle.debug = true;
    particle.debug = prob(1);
    render.push(particle);
    return particle;
  }
}

Particle.img.src = './../img/particles.png';
window.Particle = Particle;

fetch('./../img/particles.json')
  .then(res => res.json())
  .then(bossJson => {
    Particle.atlas.addImagesFromJson(bossJson, Particle.img, str => camelCaser(str.replace(/png\//i, '').replace(/^attack\d+_(\d+_*)*\d*/i,''), ' _/-'));
    
    /*Object.keys(Particle.atlas.images).forEach(img => {
      Particle.atlas.images[img].frameW = img.match(/mage/i) ? 64 : 96;
      Particle.atlas.images[img].frameH = img.match(/mage/i) ? 64 : 96;
      Particle.atlas.images[img].frameCountX = Particle.atlas.images[img].width / Boss.atlas.images[img].frameW;
    })*/
  });
