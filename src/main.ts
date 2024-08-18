import "./style.css";
import mapping from "./mapping.json" assert { type: "JSON" };

//
// vars
//

// # of brightness levels for icon rendering
const COLOR_LEVELS = mapping.length;

// zoom level options
const SVG_SIZES = [6, 8, 12, 16, 20, 26, 32, 48, 64];
// theme options (bottom gradient color, top gradient color)
const COLOR_THEMES = [
  ["white", "white"],
  ["#f00", "#f00"],
  ["#0f0", "#0f0"],
  ["#00f", "#00f"],
  ["magenta", "orange"],
  ["#00f", "#fff"],
];

// parameters for when panel should fade out
const PANEL_FADE_TIME = 4000;

//

let svgSize = 12;
let currentTheme = 0;
let currentSvgChoice = 2;

let mouseOnPanel = false;
let lastMouseTime = performance.now();

const dpr = window.devicePixelRatio || 1;
let videoAspectRatio: number;
let videoAvailable: boolean;
let images: HTMLImageElement[];

let vals: number[][]; // cached pixel brightness data
let icons: string[][]; // stored icon data

// dimensions (in # of icons)
let width: number;
let height: number;

//
// HTML Elements
//

// captures camera feed
const video = document.createElement("video");
video.autoplay = true;
video.muted = true;
video.playsInline = true;

// video element draws to `canvas` of size `width`*`height` to read pixel values
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

// icons are drawn to `renderCanvas`
const renderCanvas = document.querySelector("#canvas") as HTMLCanvasElement;
const renderCtx = renderCanvas.getContext("2d")!;

// control panel
const panelDiv = document.querySelector("#ui") as HTMLDivElement;

// gradient overlay
const gradientDiv = document.querySelector("#gradient") as HTMLDivElement;

// buttons
const buttonsSpan = document.querySelector("#buttons")! as HTMLSpanElement;
const colorBtn = document.querySelector("#color") as HTMLButtonElement;
const zoomInBtn = document.querySelector("#zoomin") as HTMLButtonElement;
const zoomOutBtn = document.querySelector("#zoomout") as HTMLButtonElement;

// no cam message
const noCamSpan = document.querySelector("#nocam")! as HTMLSpanElement;

//
// Helpers
//

function init2DArray(w: number, h: number, val: any) {
  let arr = Array(h);
  for (let i = 0; i < h; i++) {
    arr[i] = Array(w).fill(val);
  }
  return arr;
}

//
// Promise to load camera feed
//

const loadVideoPromise = new Promise<void>((resolve) => {
  navigator.mediaDevices
    .getUserMedia({ audio: false, video: true })
    .then((stream) => {
      console.log("video ready!");
      video.srcObject = stream;

      const settings = stream.getVideoTracks()[0].getSettings();
      videoAspectRatio = settings.width! / settings.height!;
      videoAvailable = true;

      resolve();
    })
    .catch(() => {
      videoAspectRatio = 1;
      videoAvailable = false;

      noCamSpan.style.display = "inline";
      buttonsSpan.style.display = "none";

      resolve();
    });
});

//
// Promise to load icon images
//

const loadIconPromise = new Promise<void>((resolve) => {
  let num_loaded = 0;

  images = mapping.map((x) => {
    const img = new Image();
    img.src = `solid/${x}.png`;
    img.onload = imageLoadCallback;
    return img;
  });

  function imageLoadCallback() {
    num_loaded++;
    if (num_loaded === mapping.length) {
      resolve();
    }
  }
});

//
// Start drawing once images and video are loaded
//

Promise.allSettled([loadVideoPromise, loadIconPromise]).then(() => {
  // start playing the video element here (needed for safari to work for some reason)
  video.play();

  resize();
  window.requestAnimationFrame(frame);
});

//

//
// Render function
//

function frame() {
  window.requestAnimationFrame(frame);

  if (videoAvailable) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  } else {
    // draw "No camera :(" onto the screen
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${window.innerWidth / 3 / svgSize}px Inconsolata, monospace`;
    ctx.fillText("ō_ō", width / 2, height / 2);
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < canvas.height; i++) {
    for (let j = 0; j < canvas.width; j++) {
      // flip the image so its like a mirror
      let _j = canvas.width - j - 1;
      if (!videoAvailable) {
        _j = j;
      }

      const pixel_loc = (i * canvas.width + _j) * 4;
      const r = imageData.data[pixel_loc];
      const g = imageData.data[pixel_loc + 1];
      const b = imageData.data[pixel_loc + 2];
      const gray = (r + g + b) / 3;
      const brightness = Math.floor((gray / 256) * COLOR_LEVELS);

      // only change the icon if brightness value changes by more than 10
      // makes the image look less jittery
      if (Math.abs(brightness - vals[i][j]) < 10) {
        continue;
      }
      vals[i][j] = brightness;

      // if the icon didn't change, no drawing needed
      const icon = mapping[brightness];
      if (icons[i][j] === icon) {
        continue;
      }
      icons[i][j] = icon;

      renderCtx.fillRect(
        j * svgSize * dpr,
        i * svgSize * dpr,
        svgSize * dpr,
        svgSize * dpr,
      );
      renderCtx.drawImage(
        images[brightness],
        j * svgSize * dpr,
        i * svgSize * dpr,
        svgSize * dpr,
        svgSize * dpr,
      );
    }
  }

  // update panel opacity
  const now = performance.now();
  if (!mouseOnPanel && now - lastMouseTime > PANEL_FADE_TIME) {
    panelDiv.style.opacity = "0";
  } else {
    panelDiv.style.opacity = "1";
  }
}

//
// resize handler
//

function resize() {
  // figure out new width and height
  width = Math.floor(window.innerWidth / svgSize);
  height = Math.floor(window.innerHeight / svgSize);

  if (width / height > videoAspectRatio) {
    height = Math.floor(width / videoAspectRatio);
  } else {
    width = Math.floor(height * videoAspectRatio);
  }

  // ensure that edges have icons too
  width += 2;
  height += 2;

  // resize stuff
  canvas.width = width;
  canvas.height = height;

  renderCanvas.width = width * svgSize * dpr;
  renderCanvas.height = height * svgSize * dpr;
  renderCanvas.style.scale = `${1 / dpr}`;
  renderCtx.fillStyle = "white";

  // reinit data
  vals = init2DArray(width, height, -200);
  icons = init2DArray(width, height, "");
}

window.addEventListener("resize", resize);

//
// Button functionality
//

colorBtn.onclick = () => {
  currentTheme = (currentTheme + 1) % COLOR_THEMES.length;
  const theme = COLOR_THEMES[currentTheme];
  gradientDiv.style.setProperty("--bottom-color", theme[0]);
  gradientDiv.style.setProperty("--top-color", theme[1]);
};

function changeZoom(dz: number) {
  currentSvgChoice += dz;
  if (currentSvgChoice < 0) {
    currentSvgChoice = 0;
    return;
  }
  if (currentSvgChoice >= SVG_SIZES.length) {
    currentSvgChoice = SVG_SIZES.length - 1;
    return;
  }
  svgSize = SVG_SIZES[currentSvgChoice];
  resize();
}

zoomInBtn.onclick = () => {
  changeZoom(1);
};

zoomOutBtn.onclick = () => {
  changeZoom(-1);
};

//
// Mouse tracking (for fading out control panel)
//

window.onmousemove = () => {
  lastMouseTime = performance.now();
};
// for mobile
window.ontouchstart = () => {
  lastMouseTime = performance.now();
};

panelDiv.onmouseenter = () => {
  mouseOnPanel = true;
};
panelDiv.onmouseleave = () => {
  mouseOnPanel = false;
};
