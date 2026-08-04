const board = document.getElementById('snakeBoard');
const scoreEl = document.getElementById('snakeScore');
const bestEl = document.getElementById('snakeBest');
const statusEl = document.getElementById('snakeStatus');
const restartBtn = document.getElementById('snakeRestart');
const multiplayer = window.GameMultiplayer.createMultiplayerController({ gameName: 'snake', onRoomState() {} });
const ctx = board.getContext('2d');
const gridSize = 20;
const tileCount = 20;
const speedStep = 85;

let snake;
let direction;
let nextDirection;
let food;
let score;
let bestScore;
let loop;
let lastTime = 0;

function initSnakeState() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  food = spawnFood();
  bestScore = Number(localStorage.getItem('snakeBestScore') || 0);
  bestEl.textContent = bestScore;
  scoreEl.textContent = score;
  statusEl.textContent = 'Speel';
  if (multiplayer.isMultiplayer()) multiplayer.sendPlayerState({ score: 0, status: 'speelt' });
}

function spawnFood() {
  const freeTiles = [];
  for (let y = 0; y < tileCount; y += 1) {
    for (let x = 0; x < tileCount; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        freeTiles.push({ x, y });
      }
    }
  }

  if (!freeTiles.length) return null;
  return freeTiles[Math.floor(Math.random() * freeTiles.length)];
}

function updateSnake() {
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  if (
    head.x < 0 ||
    head.x >= tileCount ||
    head.y < 0 ||
    head.y >= tileCount ||
    snake.some((segment) => segment.x === head.x && segment.y === head.y)
  ) {
    statusEl.textContent = 'Game over';
    if (multiplayer.isMultiplayer()) multiplayer.sendPlayerState({ score, status: 'game over' });
    clearInterval(loop);
    return;
  }

  snake.unshift(head);

  if (food && head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    if (multiplayer.isMultiplayer()) multiplayer.sendPlayerState({ score, status: 'speelt' });
    if (score > bestScore) {
      bestScore = score;
      bestEl.textContent = bestScore;
      localStorage.setItem('snakeBestScore', String(bestScore));
    }
    food = spawnFood();
  } else {
    snake.pop();
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#0d1220';
  ctx.fillRect(0, 0, board.width, board.height);

  for (let x = 0; x < tileCount; x += 1) {
    for (let y = 0; y < tileCount; y += 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeRect(x * gridSize, y * gridSize, gridSize, gridSize);
    }
  }

  snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? '#72f1b8' : '#4dc3ff';
    ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
  });

  if (food) {
    ctx.fillStyle = '#ff7ddc';
    ctx.fillRect(food.x * gridSize + 4, food.y * gridSize + 4, gridSize - 8, gridSize - 8);
  }
}

function gameLoop(timestamp) {
  const elapsed = timestamp - lastTime;

  if (!lastTime || elapsed >= speedStep) {
    updateSnake();
    drawBoard();
    lastTime = timestamp;
  }

  if (statusEl.textContent === 'Speel') {
    requestAnimationFrame(gameLoop);
  }
}

function startSnake() {
  initSnakeState();
  drawBoard();
  if (loop) {
    clearInterval(loop);
  }
  lastTime = 0;
  statusEl.textContent = 'Speel';
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  const keyMap = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 }
  };

  const next = keyMap[event.key];
  if (!next) return;

  const isOpposite = next.x === -direction.x && next.y === -direction.y;
  if (!isOpposite) {
    nextDirection = next;
  }
});

restartBtn.addEventListener('click', startSnake);
startSnake();
