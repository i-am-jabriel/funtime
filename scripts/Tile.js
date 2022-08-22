import {Atlas} from './Atlas.js';
import {arrayFrom, debug, newImage} from './helper.js';

export default class Tile {
  static atlas = new Atlas;
}

export const onLoad = [];
Tile.atlas.fetchJsonAddImages(arrayFrom(0, 2, '/img/tiles-','.json'), arrayFrom(0, 2, '/img/tiles-', '.png').map(newImage))
  .then(() => onLoad.forEach(a => a?.()));
debug && (window.Tile = Tile);