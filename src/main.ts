// @ts-nocheck
// LOL

import "./style.css";
import mapping from "./mapping.json" assert { type: "JSON" };

// placeholder
let videoAspectRatio = 16 / 9;

// display params
let WIDTH = 120;
let HEIGHT = 90;

const dpr = window.devicePixelRatio || 1;
const SVG_SIZE = 12;

// data params
const DIVISIONS = 1;
const COLOR_LEVELS = 255;

// set up video element
const video = document.createElement("video");
video.autoplay = true;

navigator.mediaDevices
  .getUserMedia({ audio: false, video: true })
  .then((stream) => {
    console.log("video ready!");
    video.srcObject = stream;

    const settings = stream.getVideoTracks()[0].getSettings();
    videoAspectRatio = settings.width / settings.height;
  });

// setup canvas
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
canvas.width = WIDTH;
canvas.height = HEIGHT;

function drawToCanvas() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}

// setup render canvas
const images = mapping.map((x) => {
  const img = new Image();
  img.src = `solid/${x}.png`;
  return img;
});

const renderCanvas = document.querySelector("#canvas") as HTMLCanvasElement;
renderCanvas.style.width = `${WIDTH * SVG_SIZE}px`;
renderCanvas.style.height = `${HEIGHT * SVG_SIZE}px`;

renderCanvas.width = WIDTH * SVG_SIZE * dpr;
renderCanvas.height = HEIGHT * SVG_SIZE * dpr;

const renderCtx = renderCanvas.getContext("2d");
renderCtx.fillStyle = "white";

// setup data
let vals = Array(HEIGHT)
  .fill(0)
  .map((x) => Array(WIDTH).fill(0));
let iconVals = Array(HEIGHT)
  .fill(0)
  .map((x) => Array(WIDTH).fill(""));

// setup grid
const boxRefs = Array(HEIGHT)
  .fill(0)
  .map((x) => Array(WIDTH).fill(null));

function processPixel(data, i) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  const gray = (r + g + b) / 3;
  return Math.floor((gray / 256) * COLOR_LEVELS);
}

function frame(timestamp) {
  window.requestAnimationFrame(frame);

  drawToCanvas();

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < canvas.height / DIVISIONS; i++) {
    for (let j = 0; j < canvas.width / DIVISIONS; j++) {
      // flip the image lol
      const _j = canvas.width / DIVISIONS - j - 1;

      let pixel_v = processPixel(imageData.data, (i * canvas.width + _j) * 4);

      if (Math.abs(pixel_v - vals[i][j]) < 10) continue;
      vals[i][j] = pixel_v;

      const icon = mapping[pixel_v];
      if (iconVals[i][j] === icon) continue;
      iconVals[i][j] = icon;

      renderCtx.fillRect(
        j * SVG_SIZE * dpr,
        i * SVG_SIZE * dpr,
        SVG_SIZE * dpr,
        SVG_SIZE * dpr
      );
      renderCtx.drawImage(
        images[pixel_v],
        j * SVG_SIZE * dpr,
        i * SVG_SIZE * dpr,
        SVG_SIZE * dpr,
        SVG_SIZE * dpr
      );
    }
  }
}

window.requestAnimationFrame(frame);

function resize() {
  // figure out new width and height
  WIDTH = Math.floor(window.innerWidth / SVG_SIZE);
  HEIGHT = Math.floor(window.innerHeight / SVG_SIZE);

  if (WIDTH / HEIGHT > videoAspectRatio) {
    HEIGHT = Math.floor(WIDTH / videoAspectRatio);
  } else {
    WIDTH = Math.floor(HEIGHT * videoAspectRatio);
  }

  // resize video canvas
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  // resize render canvas
  renderCanvas.style.width = `${WIDTH * SVG_SIZE}px`;
  renderCanvas.style.height = `${HEIGHT * SVG_SIZE}px`;

  renderCanvas.width = WIDTH * SVG_SIZE * dpr;
  renderCanvas.height = HEIGHT * SVG_SIZE * dpr;
  renderCtx.fillStyle = "white";

  // reinit data
  vals = Array(HEIGHT)
    .fill(0)
    .map((x) => Array(WIDTH).fill(0));
  iconVals = Array(HEIGHT)
    .fill(0)
    .map((x) => Array(WIDTH).fill(""));
}

window.addEventListener("resize", resize);
