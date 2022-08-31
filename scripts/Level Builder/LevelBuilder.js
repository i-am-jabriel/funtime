import {canvas, context, debug, mouseTargets, render, lerp, applyOverTime, isColliding, mouse, enemies, doUntil, onMouseUp, wait, camelCaser, Range, directions, waitForEvent, camera} from '../helper.js';
import StageObject from '../StageObject.js';
import Tile, {onLoad} from '../Tile.js';
import HUD from '../UI/HUD.js';

const tileList = []
const chapters = {};
const chapterList = [];
const state = {
  tiles: [],
  indexes: {},
  triggers: ['\uf3c5 Spawn', '\ue4e6 Wall', '\uf714 Death'].map((text, i) => ({
    text: [
      {text: text[0], font: '10px FontAwesome'},
      {text: text.slice(1), font: '9.5px Silkscreen'}
    ],
    backgroundColor: ['orange', 'blue', 'black'][i],
    color: i === 1 ? 'black' : 'white'
  })),
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
    activeTab: 0,
    content: 'tiles',
    triggers: [],
    tabs: ['\ue587 Tiles', '\uf03e Background', '\uf0e7 Triggers', '\uf468 Props', '\uf54c Enemies'].map((text, i) => new StageObject({
      fontSize: 9.5,
      font: 'Silkscreen',
      text: [
        {text: text[0], font: '10px FontAwesome'},
        // {text: ' '},
        {text: text.slice(1), font: '9.5px Silkscreen'}
      ],
      x: canvas.width * .2 + i * 105,
      color: 'white',
      alpha: i ? .4 : 1,
      y: -20,
      active: !i,
      w: 100,
      h: 25,
      hud: true,
      atlas: HUD.atlas,
      animation: 'spritesDesignButtons&Holders52',
      img: HUD.img,
      onClick() {
        state.panel.tabs[state.panel.activeTab].active = false;
        state.panel.tabs[state.panel.activeTab].onMouseOut();
        state.indexes[state.panel.content] = state.index;
        state.panel.activeTab = i;
        state.panel.tabs[state.panel.activeTab].active = true;
        state.panel.setContent(camelCaser(text.slice(2)));
       },
      onMouseOver() { 
        if(this.active) return
        this.activating?.stop();
        this.activating = applyOverTime(200, x => this.alpha = lerp(this.alpha, 1, x), () => this.activating = null);
      },
      onMouseOut() {
        if(this.active) return
        this.activating?.stop();
        this.activating = applyOverTime(200, x => this.alpha = lerp(this.alpha, .4, x), () => this.activating = null);
      }
    })),
    h: 0,
    size: 125,
    isMouseOver(){
      return isColliding(this.rect || (this.rect = {x: 0, y: canvas.height - this.size * 1.33, h: this.size * 1.33, w: canvas.width}), mouse);
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
    toggle() { this.activate(this.active); },
    setContent(content){
      this.content = content;
      state.currentTile.atlas = content === 'tiles' ? Tile.atlas : null;
      state.index = state.indexes[state.panel.content] || 0;
    }
  }),
  currentTile: Object.assign(new StageObject, {
    x: canvas.width * .5,
    y: canvas.height * .5,
    hud: true,
    atlas: Tile.atlas,
    name: 'current tile',
    onClick() {
      state.lastMousePos = null;
      let w = state.currentTile.currentAnimation?.w || 75;
      let h = state.currentTile.currentAnimation?.h || 75;
      let tile = new Tile({
        // animation: tileList[state._index],
        animation: this.animation,
        x: mouse.x - w * .5 * camera.zoom - camera.x, //+ canvas.width * .5 * (camera.zoom - 1),
        y: mouse.y - h * .5 * camera.zoom - camera.y, //+ canvas.height * .5 * (camera.zoom - 1),
        w,
        h,
        atlas: this.atlas,
        text: this.text,
        color: this.color,
        backgroundColor: this.backgroundColor,
        followMouse(mousedown){
          if(!mousedown){
            mousedown = {value: true};
            this.mouseup = onMouseUp.onFirst(() => mousedown.value = false);
          }
          state.lastMousePos ||= mouse.objectFromKeys('x','y');
          doUntil(() => {
            const dx = (state.lastMousePos.x - mouse.x), dy = (state.lastMousePos.y - mouse.y);
            this.x -= dx;
            this.y -= dy;
            state.selection.forEach(selected => {
              if(selected === this) return
              selected.x -= dx;
              selected.y -= dy;
            });
            state.lastMousePos = mouse.objectFromKeys('x','y');
            // this.x = mouse.x - state.currentTile.currentAnimation.w * .5;
            // this.y = mouse.y - state.currentTile.currentAnimation.h * .5;
            return mousedown.value && !this.stop;
          }, () => {
            this.stop = false;
            onMouseUp.remove(this.mouseup);
            this.mouseup = null;
          });
          

        },
        async onClick() {
          let mousedown = {value: true}
          let mousePromiseResponse;
          const mousePromise = new Promise(res => mousePromiseResponse = res);
          onMouseUp.onFirst(() => {
            mousedown.value = false;
            mousePromiseResponse(true);
          });
          state.lastMousePos = mouse.objectFromKeys('x', 'y');
          await Promise.race([wait(250), mousePromise]);
          if(!mousedown.value) {
            this.selected = !this.selected;
            if(!state.controls.shift) {
              state.selection.forEach(tile => tile.selected = false);
              state.selection.length = 0;
            }
            state.selection[this.selected ? 'push' : 'remove'](this);
          }
          else this.followMouse(mousedown);
        },
        onEnterFrame(){
          if(!this.selected) return;
          context.strokeStyle = 'green';
          context.lineWidth = 3;
          context.strokeRect(this.hitbox.x - 15, this.hitbox.y - 15, this.hitbox.w + 30, this.hitbox.h + 30);
          context.lineWidth = 1;
        },
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
    const data = {};
    const reset = {text: null, color: null, backgroundColor: null, animation: null, atlas: null}
    if(state.panel.content === 'triggers') {
      Object.assign(data, {
        w: 75,
        h: 75,
        font: 'arial',
        fontSize: 10,
        x: canvas.width * .5 - 75 * .5,
        y: 60 - 75 * .5
      })
      data.copyProperties(state.triggers[value], 'text', 'color', 'backgroundColor');
    }
    else if(state.panel.content === 'tiles'){
      const animation = tileList[value];
      let {w, h} = Tile.atlas.images[animation];
      if(w > h) {
        const ratio = w / h;
        w = w.clamp(40, 75);
        h = w / ratio;
      } else {
        const ratio = h / w;
        h = h.clamp(40, 75);
        w = h / ratio;
      }
      Object.assign(data, {
        w,
        h,
        x: canvas.width * .5 - w * .5,
        y: 60 - h * .5,
        atlas: Tile.atlas,
        animation
      });
    }
    Object.assign(state.currentTile, reset, data);
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
state.panel.addChild(state.panel.tabs.concat(state.currentTile));



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
const contentToArray = {
  tiles: tileList,
  triggers: state.triggers,
}
const builder = {
  next: (dir = 1) => state.index = (state.index + dir).mod(contentToArray[state.panel.content].length),
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
const movingActions = directions.concat('zoomIn', 'zoomOut').reduce((a,c) => a.setProp(c, 1), {});
const nextTime = new Range(0, 10);
const onKeyDown = e => {
  // e.preventDefault();
  // console.log(e.key);
  const control = keyMap[e.key.toLowerCase()];
  if(!control) return;
  if(control === 'space') {
    if(!placingTile)placingTile = state.currentTile.onClick();
  }
  state.controls[control] = true;
  if(state.controls.moving || !movingActions[control]) return;
  state.controls.moving = true;
  doUntil(onEnterFrame);
} 
const onKeyUp = e => {
  // e.preventDefault();
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
  if(state.controls.zoomIn) {
    const oldZoom = camera.zoom;
    const dZoom = .02 * camera.zoom * dt;
    camera.zoom += dZoom;
//  /    const ratio = (camera.zoom  - (oldZoom - 1)) ** .5;
    // const ratio = oldZoom ;
    const ratio =  Math.log2(dZoom * 1000) * .01;
    console.log(dZoom, ratio);
    if(ratio.between(-2, 2)){
      camera.x -= (150 * ratio)
      camera.y -= (96.875 * ratio);
    }
    // camera.x = -150 * Math.log2(camera.zoom);
    // camera.y = -96.875 * Math.log2(camera.zoom);
    // camera.x -= canvas.width * (17 / 3) * ratio;
    // camera.y -= canvas.height * (144 / 31) * ratio;
    // camera.x = camera.x * camera.zoom;
    // camera.y = camera.y * camera.zoom;
    // camera.y += canvas.y * camera.zoom * dt * .01;
  }
  else if(state.controls.zoomOut){
    const oldZoom = camera.zoom;
    const dZoom = .02 * camera.zoom * dt;
    camera.zoom -= dZoom;
    const ratio = Math.log2(dZoom + 1.02);
    // camera.x += canvas.width * .05 * ratio;
    // camera.y += canvas.height * .05 * ratio;
    camera.x += 150 * ratio;
    camera.y += 96.875 * ratio;
    // camera.x -= canvas.width * camera.zoom * dt * .01;
    // camera.y -= canvas.height * c=amera.zoom * dt * .01;
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
  mouseTargets.push(...state.currentTile.arrows, state.currentTile, ...state.panel.tabs, state.panel);
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
