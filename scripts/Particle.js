import { Atlas } from "./Atlas.js";
import { camelCaser } from "./helper.js";
import StageObject from "./StageObject.js";

export class Particle extends StageObject{
  static atlas = new Atlas();
  static img = new Image();
}

Particle.atlas.unpacked = true;
Particle.img.src = './../img/particles.png';
window.Particle = Particle;

fetch('./../img/particles.json')
  .then(res => res.json())
  .then(bossJson => {
    Particle.atlas.addImagesFromJson(bossJson, Particle.img, str => camelCaser(str.replace(/^attack\d+_(\d+_*)*\d*/i,''), true));
    
    /*Object.keys(Particle.atlas.images).forEach(img => {
      Particle.atlas.images[img].frameW = img.match(/mage/i) ? 64 : 96;
      Particle.atlas.images[img].frameH = img.match(/mage/i) ? 64 : 96;
      Particle.atlas.images[img].frameCountX = Particle.atlas.images[img].width / Boss.atlas.images[img].frameW;
    })*/
  });
