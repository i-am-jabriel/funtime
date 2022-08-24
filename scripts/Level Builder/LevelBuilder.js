import {canvas, context, debug, mouseTargets, render, lerp, applyOverTime, isColliding, mouse, enemies, doUntil, onMouseUp} from '../helper.js';
import StageObject from '../StageObject.js';
import Tile, {onLoad} from '../Tile.js';
import HUD from '../UI/HUD.js';

const tileList = []
const chapters = {};
const chapterList = [];
const state = {
  levelData: {},
  _index: 0,
  panel: Object.assign(new StageObject, {
    name: 'levelbuilder bottom panel',
    renderMethod: 'rect',
    color: 'rgba(90,90,90,.6)',
    x: 0,
    y: canvas.height,
    w: canvas.width,
    h: 0,
    size: 75,
    isMouseOver(){
      return isColliding(this.rect || (this.rect = {x: 0, y: canvas.height - this.size, h: this.size, w: canvas.width}), mouse);
    },
    onMouseOver(){
      this.activate();
    },
    onMouseOut(){
      this.activate(true);
    },
    activate(deactivate){
      if(this.active ^ deactivate) return;
      this.active = !deactivate;
      const startY = this.h, endY = deactivate ? 0 : this.size;
      if(this.activating) this.activating.stop();
      state.currentTile.moving = true;
      state.currentTile.arrows.forEach(arrow => arrow.moving = true);
      this.activating = applyOverTime(500, x => {
        const num = lerp(startY, endY, x ** 1.5);
        this.y = canvas.height - num;
        this.h = num;
      }, () => {
        this.activating = null;
        state.currentTile.moving = false;
        state.currentTile.arrows.forEach(arrow => arrow.moving = false);
      });
    },
    toggle() { this.activate(this.active); }
  }),
  currentTile: Object.assign(new StageObject, {
    x: canvas.width * .5,
    y: canvas.height * .5,
    atlas: Tile.atlas,
    name: 'lb',
    onClick: function() {
      let tile = new Tile({
        animation: tileList[state._index],
        x: mouse.x - state.currentTile.currentAnimation.w * .5,
        y: mouse.y - state.currentTile.currentAnimation.h * .5,
        w: state.currentTile.currentAnimation.w,
        h: state.currentTile.currentAnimation.h
      });
      render.push(tile);
      let mousedown = true;
      onMouseUp.onFirst(() => mousedown = false);
      doUntil(() => {
        tile.x = mouse.x - state.currentTile.currentAnimation.w * .5;
        tile.y = mouse.y - state.currentTile.currentAnimation.h * .5;
        return mousedown;
      })
    },
    // onEnterFrame: (dt) => {
    //   state.arrows.forEach(x => x.draw(dt));
    // },
    arrows: Array.from(new Array(4), (x, i, size = 40) => Object.assign(new StageObject, {
      text: i.between(0, 3) ? '➤' : '≫',
      color: 'darkgreen',
      fontSize: 30,
      font: 'arial',
      direction: i < 2 ? -1 : 1,
      w: 40,
      h: 40,
      moving: true,
      onClick: function(){ builder[i.between(0, 3) ? 'next' : 'skip'](this.direction) },
      onEnterFrame: function(){
        context.fillStyle = 'rgba(0,0,255,0.1)';
        context.fillRect(this.globalX, this.globalY, this.w, this.h);
      }
    })),
  }),
  mode: 'pick',
  get index(){ return state._index },
  set index(value){
    state._index = value;
    state.currentTile.animation = tileList[state._index];
    let {w, h} = Tile.atlas.images[state.currentTile.animation];
    if(w > h) {
      const ratio = w / h;
      w = w.clamp(40, 75);
      h = w / ratio;
    } else {
      const ratio = h / w;
      h = h.clamp(40, 75);
      w = h / ratio;
    }
    Object.assign(state.currentTile, {
      w,
      h,
      x: canvas.width * .5 - w * .5,
      y: 40 - h * .5,
    });
    // state.currentTile.draw(0);
    state.currentTile.arrows.forEach((arrow, i) => {
      Object.assign(arrow, {
        x: i < 2 ? - arrow.w * (2.4 - 1.2 * i) : state.currentTile.w + 20 + arrow.w * (i - 2) * 1.2, 
        y: state.currentTile.h * .5 - arrow.h * .5,
      });
    });
  }
};
state.currentTile.addChild(state.currentTile.arrows);
state.panel.addChild(state.currentTile);



onLoad.push(() => {
  tileList.push.apply(tileList, Object.keys(Tile.atlas.images).sort((a,b) => a > b || -1));
  tileList.forEach((x, i) => {
    const chapter = x.slice(0, x.nthIndex('/', 2));
    if(chapters[chapter] !== undefined) return;
    chapters[chapter] = i;
  });
  Array.prototype.push.apply(chapterList, Object.keys(chapters));
  state.currentTile.copyProperties(Tile, 'atlas');
  window.debug = levelBuilder;
})

const builder = {
  next: (dir = 1) => state.index = (state.index + dir).mod(tileList.length),
  skip: (dir = 1) => state.index = chapters[chapterList[(chapterList.indexOf(tileList[state.index].slice(0, tileList[state.index].nthIndex('/', 2))) + dir).mod(chapterList.length)]],
  current: () => tileList[state.index],
  toggle: () => state.panel.toggle(),
  state,
  chapters,
  tileList,
  chapterList
}
const initialState = {...state};
export const levelBuilder = () => {
  // setPlaying(false);
  render.length = 0;
  enemies.length = 0;
  mario.rendering = false;
  Object.assign(state, initialState);
  state.index = 0;
  mouseTargets.push(...state.currentTile.arrows, state.currentTile, state.panel);
  render.push(state.panel);
  HUD.clear(true);
  // builder.toggle();
  // render.push(state.currentTile);
  // render.moveToBack(mouseDebug);
  window.debug = builder.toggle;
  window.builder = builder;
  // window.addEventListener

  // console.log(state, tileList, chapterList);
  return builder;
}

debug && (window.levelBuilder = levelBuilder);
