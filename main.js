import { Player } from "./scripts/Player.js";
import Boss from "./scripts/Boss/Boss.js";
import DamageNumber from "./scripts/DamageNumber.js";
import Enemy from "./scripts/Enemy.js";
import { render, canvas, context, coin, playing, setPlaying, debug, players, events} from "./scripts/helper.js";


// create a mario object
// an object is a container of variables

const mario = new Player;
players.push(mario);
window.mario = mario;

window.boss = new Boss('Ogre');

// setInterval(() => new Enemy, 2000);
setInterval(() => new Enemy, 20000);

canvas.imageSmoothingEnabled = false;

// start calling the draw function every frame
let lastTick = 0;

let gamepad = null;

draw();

function draw(now) {
  // clear the canvas so that we can redraw all the objects in their new positions
  context.clearRect(0, 0, canvas.width, canvas.height);
  // const now = performance.now();
  const dt = (now - lastTick) * 0.1 || 0;

  lastTick = now;
  gamepad && pollControllers();
  
  render.forEach((obj) => obj.draw(dt));
  
  mario.draw(dt);
  // set the coins color
  context.fillStyle = coin.color;
  // draw a square at the coin's position
  context.fillRect(coin.x, coin.y, coin.w, coin.h);

  events.forEach((event) => event(dt));

  // context.fillText('hi', mario.x, mario.y);

  // context.font = '50px serif';
  // context.fillText('Se: 0', 0, 0);

  // when your gpu refreshes call the draw function again
  // https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
  playing && window.requestAnimationFrame(draw);
}
const keyBinds = {
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  1: "swing",
  2: "fireball",
  ' ': 'jump'
};

const isButtonPressed = b => b && typeof b === 'object' ? b.pressed : b > .5;
const isAxis = (b) => b < -.4 ? 0 : b > .4 ? 1 : 2;
function pollControllers(){
  // if(Math.random() > .95) console.log(gamepad.buttons, gamepad.axes);
  const gp = navigator.getGamepads()[gamepad.index];
  gp.buttons.forEach((button, i) => {
    const bind = gamepads[gamepad.type]?.['button'+i];
    i == 2 && console.log('button', i, isButtonPressed(button), button, bind, gamepads.ds3);
    if(!bind) return;
    const state = isButtonPressed(button);
    if(state != gamepad.prevState['button'+i]){
      gamepad.prevState['button'+i] = state;
      mario[bind] = state;
    }
  });
  gp.axes.forEach((axis, i) => {
    const bind = gamepads[gamepad.type]?.['axis'+i];
    if(!bind) return;
    const state = isAxis(axis);
    if(state != gamepad.prevState['axis'+i]) {
      gamepad.prevState['axis'+i] = state;
      bind.forEach(input => mario[input] = false);
      if(state !== 2) mario[bind[state]] = true;
    }
  });
}

const gamepads = {
  ds3: {
    axis0: ['left', 'right'],
    axis1: ['up', 'down'],
    button0: 'jump',
    button1: '',
    button2: 'swing',
    button3: 'fireball',
  },
};
window.addEventListener("gamepadconnected", e => { gamepad = e.gamepad; gamepad.type = 'ds3'; gamepad.prevState = {}});
window.addEventListener("gamepaddisconnected", e => gamepad = null);

// event listener for mario inputs
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    setPlaying(!playing);
    if (playing) draw(0);
  }
  if (debug && e.key.toLowerCase() === 'p') window.debug()
  // stop the event from bubbling  (stop the key presses from doing what they normally do)
  // e.preventDefault();
  // if arrow key is pressed move marios relative cardinal direction
  const bind = keyBinds[e.key.toLowerCase()];
  if (bind) mario[bind] = true;
});

// event listener for mario inputs
window.addEventListener("keyup", (e) => {
  // console.log(e);

  // stop the event from bubbling  (stop the key presses from doing what they normally do)
  // e.preventDefault();
  // if arrow key is pressed move marios relative cardinal direction
  const bind = keyBinds[e.key.toLowerCase()];
  if (bind) mario[bind] = false;
});

if(debug){
  window.debug=()=>(new DamageNumber(13, mario.cx, mario.cy));
  window.render = render;
}