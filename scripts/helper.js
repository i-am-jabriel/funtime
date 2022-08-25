export const render = [];
export const mouseTargets = [];

export const wait = ms => new Promise(res => setTimeout(res, ms));

Object.defineProperty(Object.prototype, 'extend', {
  value: function(data, soft){ 
      // for(let key in data){
      //     let property = Object.getOwnPropertyDescriptor(data, key);
      //     if(!property.writable) data[key] = property;
      //     else data[key] = {value:data[key], writable: !!soft};
      //     // data[key] = {value:data[key], writable: !!soft};
      // }
      Object.defineProperties(this, Object.keys(data).reduce((output, key) => {
        const property = Object.getOwnPropertyDescriptor(data, key);
        output[key] = property.writable ? {value: data[key], writable: !!soft} : property;
        return output;
      }, {}));
      return this;
  },
  writable: true,
});

Number.prototype.extend({
  clamp: function(a, b){
      let big = b, small = a;
      if(a > b){
          big = a;
          small = b;
      }
      return Math.min(big,Math.max(this,small));
  },
  clampTheta: function(){
      return (this + Math.PI).mod(Math.PI * 2) - Math.PI;
  },
  between: function(a, b){ return this > a && this < b; },
  betweenTheta: function(a, b){
      a = a.clampTheta()
      b = b.clampTheta();
      let x  = this.clampTheta();
      if (a < b) return a <= x && x <= b;
      return a <= x || x <= b;
  },
  round(a){ return Math.round(this / a) * a; },
  mod: function(n){ return ((this%n)+n)%n; },
  append(value, round = 1){
      if(round != 1) return  +(this + value).toFixed(round);
      else return this + value;
  },
  product(value, round = 1){
      if(round != 1) return  +(this * value).toFixed(round);
      else return this * value;
  },
  // scaleByWidth(){return this * (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) / canvas?.width / camera.zoom;},
  // scaleByHeight(){return this * (window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight) / canvas?.height /  camera.zoom;},
  get scaleByWidth(){return this *  canvas.width / window.innerWidth / camera.zoom;},
  get scaleByHeight(){return this * canvas.height / window.innerHeight / camera.zoom;},
  
  moveTowards(value, maxStep){return this > value ? Math.max(this - maxStep, value) : Math.min(this + maxStep, value)},
  moveTowardsTheta(theta, delta) {
    const diff = theta - this;
    return Math.abs(diff) > delta ? this + Math.sign(diff) * delta : theta;
  }
});

String.prototype.extend({
  nthIndex(pat, n){
    let L= this.length, i= -1;
    while(n-- && i++<L){
        i= this.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
  }
});

export class Random{
  static range(min, max){
      return Math.random() * (max - min) + min;
  }
  // inclusive
  static intRange(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
export function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}
export function prob(n){
  return Math.random() * 100 <= n;
}

export class Range{
  constructor(min = 0, max = 1, value){
      this.min = min;
      this.max = max;
      this.onValue = [];
      this._value = value || min;
  }
  range(){
      return Random.range(this.min,this.max);
  }
  intRange(){ return Random.intRange(this.min, this.max); }
  
  reset(){
      this._value = this.min;
  }
  lerp(t){
      return lerp(this.min, this.max, t);
  }
  get vMax(){
      return this._value /this.max;
  }
  get vMin(){
      return this._value /this.min;
  }
  get ratio(){
      return this.min/this.max;
  }
  get value(){
      return this._value;
  }
  set value(value){
      this._value = value.clamp(this.min,this.max);
      var i = this.onValue.length;
      while(i--) this.onValue[i]();
  }
}

Array.prototype.extend({
  pick(n = 1){
      return n == 1 ? this[Random.intRange(0, this.length - 1)] : this.sort(() => .5 - Math.random()).slice(0,n);
  },
  remove(item){
      let index = this.indexOf(item);
      if(index == -1)return;
      return this.splice(index, 1)[0];
  },
  serialize(parent = true){
      let data = [...this], i = 0;
      const len = this.length;
      for(;i < len; i++){
          data[i] = data[i]?.serialize?.(false) || data[i];
      }
      return parent ? stringify(data) : data;
  },
  deserialize(json){
      let data = typeof json == 'string' ? parse(json) : json, i = 0;
      const len = this.length;
      for(;i < len; i++){
          data[i] = data[i]?.deserialize?.(data[i]) || data[i];
          if(typeof data[i] == 'function')data[i] = data[i].bind(this);
      }
      return data;
  },
  shuffle(){
      let elements = [...this];
      this.length = 0;
      let element;
      while(elements.length){ 
          element = elements.pick();
          this.push(element);
          elements.remove(element);
      }
      return this;
  },
  moveToBack(element) {
      if(!this.includes(element))return;
      this.remove(element);
      this.push(element);
  },
  lerp(v){
    return this[this.lerpIndex(v)];
  },
  lerpIndex(v){
    return Math.floor(lerp(0, this.length - 1, v));
  },
  onFirst(fn){
    const wrap = (...args) => fn(...args) ^ this.remove(wrap);
    this.push(wrap);
    return this;
  }
});

export let debug = true;
export let playing = true;
export const players = [];
export const events = [];
export const setPlaying = n => playing = n;
export const canvas = document.querySelector("canvas");
export const camera = {x: 0, y:0, zoom: 1}
canvas.w = canvas.width * .9;
canvas.h = canvas.height * 1.2;
canvas.x += canvas.width * .5;
Object.assign(canvas, {
  get x(){ return camera.x },
  get y() { return camera.y }
});
export const context = canvas.getContext("2d");
setTimeout(() => canvas.focus(), 200);


// do this function every frame until a is false then run b
export function doUntil(a, b) {
  const f = dt => !a(dt) && f.stop();
  f.extend({stop: () => {
    f.running = false;
    events.remove(f);
    b?.();
  }});
  events.push(f);
  f(0);
  return f;
}
export const doUntilAsync = a => new Promise(res => doUntil(a, res))

export const frameCount = new Range(0, 0);
export function applyOverTime(t,a,b) {
  let count = 0
  let f = (dt) => {
      count += dt * 10;
      let val = Math.min(1,count/t);
      a(val, dt);
      if(val === 1){
        f.running = false;
        events.remove(f);
        if(b)b();
      }
      //else window.requestAnimationFrame(f);
  }
  f.running = true;
  f.extend({stop: () => f.running = false || events.remove(f)});
  // f.stop = () => stop = true;
  f(0);
  events.push(f);
  return f;
}
//Apply Over Time Forwards and Backwards
export function rubberBand(t, a, b){
  return applyOverTime(t, (x, dt) => {
      if(x < .5) a(x * 2, dt)
      else a((1 - x)/.5, dt, true);
  } ,()=>{
      a(0, true);
      b?.();
  });
}

export function rubberBandAsync(t, a) { return new Promise(res => rubberBand(t, a, res))}
export const scoreElement = document.querySelector('.score');
export let score = 0;
export const updateScore = n =>{
  score += n;
  scoreElement.innerText = `Score: ${score}`;
}

// create a coin object
export const coin = {
  x: 100,
  y: 100,
  w: 40,
  h: 40,
  color: "yellow"
};


// is object1 collding with obj2
// https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection
export function isColliding(obj1, obj2) {
  return obj1.x < obj2.x + obj2.w &&
    obj1.x + obj1.w > obj2.x &&
    obj1.y < obj2.y + obj2.h &&
    obj1.h + obj1.y > obj2.y;
}

// load up a coin sound effect to be used later
export const coinSFX = new Audio("./sfx/smw_coin.wav");

export const enemies = [];

export const directionToRad = {
  up: Math.PI / 2,
  down: Math.PI * 3 / 2,
  left: Math.PI,
  right: 0,
  downRight: Math.PI * 7 / 4
}
export const directions = ['up','down','left','right'];
export const getThetaFromDirections = obj => {
  const bools = directions.reduce((a, c) => a + obj[c], 0);
  if(bools === 0) return directionToRad[obj.direction === 1 ? 'right' : 'left'];
  return (obj.right && obj.down ? Math.PI : 0) + directions.reduce((a, c) => a + obj[c] * directionToRad[c], 0) / bools;
}

export const getTheta = (dx, dy) => Math.atan2(dy, dx);

Object.prototype.extend({
  getProp(name){
      const split = name.split('.').reverse();
      let val = this;
      let prop;
      while(val && (prop = split.pop())) val = val?.[prop];
      return val;
  },
  setProp(name, value){
      if(!name)
          return console.warn('invalid usage of set prop no name')
      if(value === undefined)
          return console.warn('invalid use of setProp no value needs 2 args');
      const split = `${name}`.split('.');
      if(split.length == 1){
          this[name] = value;
          return this;
      }
      let val = this, prop;
      while(prop = split.shift()){
          val = val[prop] ?
              (val[prop] = split.length ? val[prop] : value):
              (val[prop] = split.length ? {} : value);
      }
      return this;
  },
  objectFromKeys(...args){
    return args.reduce((a,c) => this[c] !== undefined ? a.setProp(c, this[c]) : a , {});
  },
  copyProperties(obj, ...properties){
    if(typeof properties[0] === 'string')
      properties.forEach(key => this[key] = obj[key]);
    else {
      properties = properties[0];
      const keys = Object.keys(properties);
      keys.forEach(key => this[key] = obj[properties[key]]);
    }
    return this;
  }
});

export const mouse = {x:0, y:0, w:1, h:1};
export const mouseDebug = {
  color: 'black',
  draw:() => {
    return
    context.fillStyle = mouseDebug.color;
    context.fillRect(mouse.x - 5, mouse.y - 5, mouse.w + 6, mouse.h + 6);
  }
}
if(debug){
  render.push(mouseDebug);
  window.mouse = mouse;
}
export const onMouseMove = (e) => {
  e && Object.assign(mouse, {x: e.clientX.scaleByWidth, y: e.clientY.scaleByHeight});
      //new Point(e.clientX * elementReferences['canvas'].width / document.body.clientWidth, e.clientY * elementReferences['canvas'].height / document.body.clientHeight)
  const clickable = [];
  for(const obj of mouseTargets){
      const contains = obj.isMouseOver?.(mouse) || isColliding(obj.hitbox || obj, mouse);
      if(contains && obj.onClick) clickable.push(obj);
      if(contains && !obj.mouseOver){
          obj.mouseOver = true;
          obj.onMouseOver?.();
      }
      if(!contains && obj.mouseOver){
          obj.mouseOver = false;
          obj.onMouseOut?.();
      }
  }
  mouseDebug.color = 'black';
  document.body.style.cursor = clickable.length ? 'pointer' : 'inherit';
  mouseDebug.color = clickable.length ? 'yellow' : 'black';
  return clickable.length && clickable;
}

export const onMouseClick = (e) => {
  e && Object.assign(mouse, {x: e.clientX.scaleByWidth, y: e.clientY.scaleByHeight});
      //new Point(e.clientX * elementReferences['canvas'].width / document.body.clientWidth, e.clientY * elementReferences['canvas'].height / document.body.clientHeight)
  for(const obj of mouseTargets){
    const contains = (obj.isMouseOver?.(mouse) || isColliding(obj.hitbox || obj, mouse)) && obj.onClick;
    if(contains){
        obj.onClick();
        return obj;
    }
  }
}
export const onMouseUp = [];
export const addMouseListeners = () => {
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mousedown', onMouseClick);
  window.addEventListener('mouseup', e => onMouseUp.forEach(x => x(e)));
}

// export const camelCaser = (str, proper) => str?.toLowerCase().replace(proper ? /[ _]+./ : / +./gi, x => x.toUpperCase().slice(-1));
// export const camelCaser = (str, proper) => {
export const camelCaser = (str, keys = ' ') => str?.toLowerCase().replace(keys instanceof RegExp ? keys : new RegExp(`[${keys}]+.`,'gi'), x => x.toUpperCase().slice(-1));
  // return str?.toLowerCase().replace(proper ? /[ _]+./ : / +./gi, x => x.toUpperCase().slice(-1)).replace(proper ? /[ _]+./ : / +./gi, x => x.toUpperCase().slice(-1));
// }

export const getDistance = (a, b) => (((a.x - b.x) ** 2) + ((a.y - b.y) ** 2)) ** .5;

export function arrayFrom(a, b, pre='', post=''){
  let max = Math.max(a, b);
  let min = Math.min(a, b);
  let output = [];
  for(; min <= max; min++){
      output.push(`${pre}${min}${post}`);
  }
  return output;
}

export const createContext = (parent = '.game-container') => {
  const newCanvas = document.createElement('canvas');
  parent = typeof parent === 'string' ? document.querySelector(parent) : parent;
  parent.appendChild(newCanvas);
  newCanvas.copyProperties(canvas, 'w','h','width','height');
  return newCanvas.getContext('2d');
}

export const newImage = (src) => { return new Image().setProp('src',src); }

export function rvar (name, value, context = {}) {
  // If `this` is a `rvar` instance
  if (this instanceof rvar) {
    // Inside `rvar` context...

    // Internal object value
    this.value = value;

    // Object `name` property
    Object.defineProperty(this, 'name', { value: name });

    // Object `hasValue` property
    Object.defineProperty(this, 'hasValue', {
      get: function () {
        // If the internal object value is not `undefined`
        return this.value !== undefined;
      }
    });

    // Copy value constructor for type-check
    if ((value !== undefined) && (value !== null)) {
      this.constructor = value.constructor;
    }

    // To String method
    this.toString = function () {
      // Convert the internal value to string
      return this.value + '';
    };
  } else {
    // Outside `rvar` context...

    // Initialice `rvar` object
    if (!rvar.refs) {
      rvar.refs = {};
    }

    // Store variable
    rvar.refs[name] = new rvar(name, value, context);

    // Define variable at context
    Object.defineProperty(context, name, {
      // Getter
      get: function () { return rvar.refs[name]; },
      // Setter
      set: function (v) { rvar.refs[name].value = v; },
      // Can be overrided?
      configurable: true
    });

    // Return object reference
    return context[name];
  }
}

export function waitForEvent(element = window, event = 'click') {
  let listener;
  return new Promise(resolve => {
      listener = event => {
          listener.close();
          resolve(event);
      };
      element.addEventListener(event, listener.setProp('close', () => element.removeEventListener(event, listener)));
  }).setProp('listener', listener);
}