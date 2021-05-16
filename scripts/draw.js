const canvas = document.getElementById("canvas");
const gpu = new GPU({
  canvas: canvas,
  mode: "gpu",
});

const setupCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

setupCanvas();

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

document.addEventListener("keydown", updateParams);

let feed = 0.0545;
let k = 0.06093;
let dA = 0.9;
const dB = 0.5;
const dT = 1;

function updateParams(e) {
  e.preventDefault();
  if (e.code === "ArrowUp") {
    console.log(feed);
    feed += 0.001;
  } else if (e.code === "ArrowDown") {
    console.log(feed);
    feed -= 0.001;
  } else if (e.code === "ArrowRight") {
    console.log(k);
    k += 0.001;
  } else if (e.code === "ArrowLeft") {
    console.log(k);
    k -= 0.001;
  } else if (e.code === "KeyP") {
    console.log(dA);
    dA += 0.01;
  } else if (e.code === "KeyO") {
    console.log(dA);
    dA -= 0.01;
  }
}

const init = gpu
  .createKernel(function () {
    let cell = [1.0, 0.0];

    if (Math.random() < 0.03) {
      cell[1] = 1.0;
    }

    return cell;
  })
  .setPipeline(true)
  .setOutput([canvasWidth, canvasHeight])
  .setConstants({ canvasWidth, canvasHeight });

const update = gpu
  .createKernel(function (grid, dA, dB, feed, k, dT) {
    let laplaceA = 0;
    let laplaceB = 0;

    const middle = grid[this.thread.y][this.thread.x];
    const left = grid[this.thread.y - 1][this.thread.x];
    const right = grid[this.thread.y + 1][this.thread.x];
    const top = grid[this.thread.y][this.thread.x + 1];
    const bottom = grid[this.thread.y][this.thread.x - 1];
    const bottomLeft = grid[this.thread.y - 1][this.thread.x - 1];
    const bottomRight = grid[this.thread.y + 1][this.thread.x - 1];
    const topRight = grid[this.thread.y + 1][this.thread.x + 1];
    const topLeft = grid[this.thread.y - 1][this.thread.x + 1];

    laplaceA += middle[0] * -1.0;
    laplaceA += left[0] * 0.2;
    laplaceA += right[0] * 0.2;
    laplaceA += top[0] * 0.2;
    laplaceA += bottom[0] * 0.2;
    laplaceA += bottomLeft[0] * 0.05;
    laplaceA += bottomRight[0] * 0.05;
    laplaceA += topRight[0] * 0.05;
    laplaceA += topLeft[0] * 0.05;

    laplaceB += middle[1] * -1.0;
    laplaceB += left[1] * 0.2;
    laplaceB += right[1] * 0.2;
    laplaceB += top[1] * 0.2;
    laplaceB += bottom[1] * 0.2;
    laplaceB += bottomLeft[1] * 0.05;
    laplaceB += bottomRight[1] * 0.05;
    laplaceB += topRight[1] * 0.05;
    laplaceB += topLeft[1] * 0.05;

    let a = middle[0];
    let b = middle[1];
    let ab2 = a * b * b;

    let nextA = a + (dA * laplaceA - ab2 + feed * (1 - a)) * dT;
    let nextB = b + (dB * laplaceB + ab2 - (k + feed) * b) * dT;

    if (nextA > 1) {
      nextA = 1;
    }
    if (nextA < 0) {
      nextA = 0;
    }

    if (nextB > 1) {
      nextB = 1;
    }
    if (nextB < 0) {
      nextB = 0;
    }

    return [nextA, nextB];
  })
  .setPipeline(true)
  .setImmutable(true)
  .setOutput([canvasWidth, canvasHeight]);

const draw = gpu
  .createKernel(function (grid) {
    const cell = grid[this.thread.y][this.thread.x];
    let c = Math.abs(cell[0] - cell[1]);

    if (c < 0.5) {
      c = 0.0;
    } else if (c > 1.0) {
      c = 1.0;
    }

    this.color(c, c, c, 1);
  })
  .setOutput([canvasWidth, canvasHeight])
  .setGraphical(true);

let grid = init();
let next = grid.clone();

const animate = function () {
  grid = update(next, dA, dB, feed, k, dT);
  next.delete();

  draw(grid);

  next = grid.clone();
  grid.delete();

  window.requestAnimationFrame(animate);
};

window.requestAnimationFrame(animate);
