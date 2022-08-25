import {canvas, context, debug, mouseTargets, render, lerp, applyOverTime, isColliding, mouse, enemies, doUntil, onMouseUp, wait, rvar, Range, directions, waitForEvent, camera} from '../helper.js';
import StageObject from '../StageObject.js';
import Tile, {onLoad} from '../Tile.js';
import HUD from '../UI/HUD.js';

const tileList = []
const chapters = {};
const chapterList = [];
const state = {
  tiles: [],
  controls: {},
  selection: [],
  _index: 0,
  panel: Object.assign(new StageObject, {
    name: 'levelbuilder bottom panel',
    renderMethod: 'rect',
    hud: true,
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
      this.activating = applyOverTime(500, x => {
        const num = lerp(startY, endY, x ** 1.5);
        this.y = canvas.height - num;
        this.h = num;
      }, () => this.activating = null);
    },
    toggle() { this.activate(this.active); }
  }),
  currentTile: Object.assign(new StageObject, {
    x: canvas.width * .5,
    y: canvas.height * .5,
    hud: true,
    atlas: Tile.atlas,
    name: 'lb',
    followMouse(mousedown, child){
      if(!mousedown){
        mousedown = {value: true};
        onMouseUp.onFirst(() => mousedown.value = false);
      }
      if(!child) state.selection.forEach(selected => selected !== this && selected.followMouse(mousedown, true));
      let lastPos = mouse.objectFromKeys('x', 'y');
      doUntil(() => {
        this.x -= lastPos.x - mouse.x;
        this.y -= lastPos.y - mouse.y;
        lastPos = mouse.objectFromKeys('x','y');
        // this.x = mouse.x - state.currentTile.currentAnimation.w * .5;
        // this.y = mouse.y - state.currentTile.currentAnimation.h * .5;
        return mousedown.value && !this.stop;
      }, () => this.stop = false);
    },
    async tileOnClick() {
      let mousedown = {value: true}
      onMouseUp.onFirst(() => mousedown.value = false);
      await wait(200);
      if(!mousedown.value) {
        this.selected = !this.selected;
        state.selection[this.selected ? 'push' : 'remove'](this);
      }
      else if(this.selected) this.followMouse(mousedown);
    },
    tileOnEnterFrame(){
      if(!this.selected) return;
      context.strokeStyle = 'green';
      context.lineWidth = 3;
      context.strokeRect(this.hitbox.x - 20, this.hitbox.y -20, this.hitbox.w + 40, this.hitbox.h + 40);
      context.lineWidth = 1;
    },
    onClick() {
      let tile = new Tile({
        animation: tileList[state._index],
        x: mouse.x - state.currentTile.currentAnimation.w * .5 - camera.x,
        y: mouse.y - state.currentTile.currentAnimation.h * .5 - camera.y,
        w: state.currentTile.currentAnimation.w,
        h: state.currentTile.currentAnimation.h,
        followMouse: state.currentTile.followMouse,
        onEnterFrame: state.currentTile.tileOnEnterFrame,
        onClick: state.currentTile.tileOnClick,
      });
      tile.followMouse();
      render.push(tile);
      state.tiles.push(tile);
      mouseTargets.push(tile);
      return tile;
    },
    // onEnterFrame: (dt) => {
    //   state.arrows.forEach(x => x.draw(dt));
    // },
    arrows: Array.from(new Array(4), (x, i, size = 40) => Object.assign(new StageObject, {
      text: i.between(0, 3) ? '➤' : '≫',
      color: 'darkgreen',
      fontSize: 30,
      font: 'arial',
      hud: true,
      direction: i < 2 ? -1 : 1,
      w: 40,
      h: 40,
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

const keyMap = {
  arrowup: 'up',
  w: 'up',
  arrowdown: 'down',
  s: 'down',
  arrowleft: 'left',
  a: 'left',
  arrowright: 'right',
  d: 'right',
  shift: 'shift',
  alt: 'control',
  ' ': 'space',
  '+': 'zoomIn',
  '=': 'zoomIn',
  '_': 'zoomOut',
  '-': 'zoomOut',
}
let placingTile = false;
const nextTime = new Range(0, 10);
const onKeyDown = e => {
  e.preventDefault();
  console.log(e.key);
  const control = keyMap[e.key.toLowerCase()];
  if(!control) return;
  if(control === 'space') {
    if(!placingTile)placingTile = state.currentTile.onClick();
  }
  state.controls[control] = true;
  if(state.controls.moving || !directions.includes(control)) return;
  state.controls.moving = true;
  doUntil(onEnterFrame);
} 
const onKeyUp = e => {
  e.preventDefault();
  const control = keyMap[e.key.toLowerCase()];
  if(!control) return;
  if(control === 'space') {
    if(placingTile){
      placingTile.stop = true;
      placingTile = null;
    }
  }
  state.controls[control] = false;
  state.controls.moving = directions.some(x => state.controls[x]);
  if(!state.controls.moving) nextTime.value = 0;
}
const onEnterFrame = dt => {
  if(state.panel.active && (nextTime.value -= dt) <= 0){
    nextTime.value = nextTime.max;
    if(state.controls.left || state.controls.right){
      builder[state.controls.control ? 'skip' : 'next']((state.controls.right || -1) * ((state.controls.shift * 4) || 1));
    }
  }
  if(!state.panel.active){
    if(state.controls.up) camera.y += 5 * dt;
    if(state.controls.down) camera.y -= 5 * dt;
    if(state.controls.left) camera.x += 5 * dt;
    if(state.controls.right) camera.x -= 5 * dt;
  }
  return state.controls.moving;
}
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
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // window.addEventListener

  // console.log(state, tileList, chapterList);
  return builder;
}

debug && (window.levelBuilder = levelBuilder);
