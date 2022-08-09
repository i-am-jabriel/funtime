import { Atlas } from '../Atlas.js';
import { camelCaser, createContext, newImage } from '../helper.js';
import StageObject from '../StageObject.js';

export default class HUD extends StageObject {
  static img = newImage('./../img/ui.png');
  static atlas = new Atlas();
  static animations = {

  }
  static context = createContext();
  constructor(data){
    Object.assign(this.copyValues(HUD, 'animations', 'atlas', 'img', 'context'), data);
  }
}

HUD.atlas.fetchJsonAddImages('./../img/ui.json', HUD.img, x => camelCaser(x.replace(/\/*png\/*/gi, ''), / .|_.|\/16x16\/.|\/32x32\/.|\/./gi));
window.HUD = HUD;