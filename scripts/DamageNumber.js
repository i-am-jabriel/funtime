import { Random, render } from "./helper.js";
import StageObject from "./StageObject.js";

export default class DamageNumber extends StageObject{
  constructor(text,x,y){
    super();
    this.x = x;
    this.y = y;
    this.text = text + ' ';
    this.value = 0;
    this.frames = this.maxFrames = 144;
    // this.reset();
    this.dx = Random.range(-3, 3);
    this.ddx = Random.range(-.1, .1);
    this.dy = Random.range(-12, -7);
    this.ddy = Random.range(.1, .4);
    this.baseState = (({dx, dy, ddx, ddy, frames}) => ({dx, dy, ddx, ddy, frames }))(this);
    this.color = 'white';
    this.stroke = 'black';
    this.fontSize = 25;
    this.font = 'Patrick Hand SC';
    this.w = 50;
    this.h = 50;
    render.push(this);
  }
  onEnterFrame(dt){
    this.x += (this.dx += this.ddx * dt) * dt;
    this.y += (this.dy += this.ddy * dt) * dt;
    if((this.frames -= dt) <= 0) this.destroy();
  }
  reset(x,y){
    Object.assign(this, this.baseState);
    this.frames = this.maxFrames;

    if(x) this.x = this.x.moveTowards(x, 20 / ((this.x / x)) || 3);
    if(y) this.y = this.y.moveTowards(y, 20 / ((this.y / y)) || 3);
    this.fontSize += .01;
  }
  destroy(){
    render.splice(render.indexOf(this), 1);
  }
}