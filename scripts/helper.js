export const render = [];

Object.defineProperty(Object.prototype, 'extend', {
  value: function(data, soft){ 
      for(let key in data){
          let property = Object.getOwnPropertyDescriptor(data, key);
          if(!property.writable) data[key] = property;
          else data[key] = {value:data[key], writable: !!soft};
          // data[key] = {value:data[key], writable: !!soft};
      }
      Object.defineProperties(this, data)
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
  scaleByWidth(){return this * (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) / elementReferences?.['canvas']?.width / zoom;},
  scaleByHeight(){return this * (window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight) / elementReferences?.['canvas']?.height /  zoom;},
  moveTowards(value, maxStep){return this > value ? Math.max(this - maxStep, value) : Math.min(this + maxStep, value)}
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

export let debug = true;
export let playing = true;
export const setPlaying = n => playing = n;
export const canvas = document.querySelector("canvas");
export const context = canvas.getContext("2d");
setTimeout(() => canvas.focus(), 200);

export const frameCount = new Range(0, 0);
export function applyOverTime(t,a,b) {
  let count = 0
  let time = Date.now();
    let stop = false;
    let f = ()=>{
        if(frameCount.value){
            return window.requestAnimationFrame(f);
        }
        let now = Date.now();
        if(!playing){
            time = now;
            return;
        }
        let dt = now - time;
        count += dt;
        time = now;
        let val = Math.min(1,count/t);
        a(val,dt);
        if(stop)return;
        if(val === 1){
            if(b)b();
        }else{
            window.requestAnimationFrame(f);
        }
    }
    // f.extend({stop: () => stop = true});
    f.stop = () => stop = true;
    f();
    return f;
}

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
  // console.log((obj.right && obj.down ? Math.PI : 0) + directions.reduce((a, c) => a + obj[c] * directionToRad[c], 0) / bools);
  return (obj.right && obj.down ? Math.PI : 0) + directions.reduce((a, c) => a + obj[c] * directionToRad[c], 0) / bools;
}

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
});

// export const camelCaser = (str, proper) => str?.toLowerCase().replace(proper ? /[ _]+./ : / +./gi, x => x.toUpperCase().slice(-1));
export const camelCaser = (str, proper) => {
  return str?.toLowerCase().replace(proper ? /[ _]+./ : / +./gi, x => x.toUpperCase().slice(-1)).replace(proper ? /[ _]+./ : / +./gi, x => x.toUpperCase().slice(-1));
}