import {Atlas} from './Atlas.js';
import {arrayFrom, debug, newImage} from './helper.js';
import StageObject from './StageObject.js';

export default class Tile extends StageObject {
  static atlas = new Atlas;
  constructor(data){
    super();
    Object.assign(this, Tile.objectFromKeys('atlas'), data);
  }
}

export const onLoad = [];
Tile.atlas.fetchJsonAddImages(arrayFrom(0, 2, '/img/tiles-','.json'), arrayFrom(0, 2, '/img/tiles-', '.png').map(newImage))
  .then(() => onLoad.forEach(a => a?.()));
debug && (window.Tile = Tile);