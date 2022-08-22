import {canvas, context, setPlaying, debug, mouseTargets, render, mouseDebug} from '../helper.js';
import StageObject from '../StageObject.js';
import Tile, {onLoad} from '../Tile.js';

const tileList = []
const chapters = {};
const chapterList = [];
const state = {
  _index: 0,
  arrows: Array.from(new Array(4), (x, i) => Object.assign(new StageObject, {
    text: i.between(0, 3) ? '→' : '↠',
    color: 'darkgreen',
    fontSize: 30,
    font: 'arial',
    direction: i < 2 ? -1 : 1,
    w: 40,
    h: 40,
    onClick: function(){ builder[i.between(0, 3) ? 'next' : 'skip'](this.direction) },
    onEnterFrame: function(){
      context.fillStyle = 'rgba(0,0,255,0.1)';
      context.fillRect(this.x, this.y, this.w, this.h);
    }
  })),
  currentTile: Object.assign(new StageObject, {
    x: canvas.width * .5,
    y: canvas.height * .5,
    name: 'lb',
    onEnterFrame: (dt) => {
      state.arrows.forEach(x => x.draw(dt));
    },
  }),
  mode: 'pick',
  get index(){ return state._index },
  set index(value){
    state._index = value;
    state.currentTile.animation = tileList[state._index];
    let {w, h} = Tile.atlas.images[state.currentTile.animation];
    let ow = w, oh = h;
    if(w > h) {
      const ratio = w / h;
      w = w.clamp(40, 75);
      h = w / ratio;
    } else {
      const ratio = h / w;
      h = h.clamp(40, 75);
      w = h / ratio;
    }
    Object.assign(state.currentTile, {w, h});
    state.currentTile.x = canvas.width * .5 - state.currentTile.w * .5;
    state.currentTile.y = canvas.height * .5 - state.currentTile.h * .5;
    state.currentTile.draw(0);
    state.arrows.forEach((arrow, i) => {
      Object.assign(arrow, {
        x: i < 2 ? state.currentTile.x - arrow.w * (2.4 - 1.2 * i) : state.currentTile.x + state.currentTile.w + 20 + arrow.w * (i - 2) * 1.2, 
        y: state.currentTile.y + state.currentTile.h * .5,
      });
    });
  }
};


onLoad.push(() => {
  Array.prototype.push.apply(tileList, Object.keys(Tile.atlas.images));
  tileList.forEach((x,i) => {
    if(chapters[x.slice(0, x.indexOf('/'))] !== undefined) return;
    chapters[x.slice(0, x.indexOf('/'))] = i;
  });
  Array.prototype.push.apply(chapterList, Object.keys(chapters));
  state.currentTile.copyProperties(Tile, 'atlas');
  window.debug = levelBuilder;
});

const builder = {
  next: (dir = 1) => state.index = (state.index + dir).mod(tileList.length),
  skip: (dir = 1) => state.index = chapters[chapterList[(chapterList.indexOf(tileList[state.index].slice(0, tileList[state.index].indexOf('/'))) + dir).mod(chapterList.length)]],
  current: () => tileList[state.index]
}
const initialState = {...state};
export const levelBuilder = () => {
  // setPlaying(false);
  render.length = 1;
  Object.assign(state, initialState);
  state.index = 0;
  mouseTargets.push(...state.arrows);
  render.push(state.currentTile);
  render.moveToBack(mouseDebug);
  window.debug = builder.next;

  // console.log(state, tileList, chapterList);
  return builder;
}

debug && (window.levelBuilder = levelBuilder);
