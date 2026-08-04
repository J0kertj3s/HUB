const boardEl = document.getElementById('cfBoard');
const statusEl = document.getElementById('cfStatus');
const roomInput = document.getElementById('cfRoomInput');
const joinBtn = document.getElementById('cfJoinRoom');
const restartBtn = document.getElementById('cfRestart');

const rows = 6;
const cols = 7;
let board = Array.from({ length: rows }, () => Array(cols).fill(''));
let currentPlayer = 'R';
let gameOver = false;

const multiplayer = window.GameMultiplayer.createMultiplayerController({
  gameName: 'ConnectFour',
  onRoomState: (payload) => {
    if (!payload || !payload.state || !payload.state.board) return;
    board = payload.state.board;
    currentPlayer = payload.state.currentPlayer || 'R';
    gameOver = payload.state.gameOver || false;
    renderBoard();
  }
});

function renderBoard() {
  boardEl.innerHTML = '';
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = document.createElement('div');
      const value = board[row][col];
      cell.className = `cell ${value === 'R' ? 'red' : value === 'Y' ? 'yellow' : ''}`;
      cell.addEventListener('click', () => handleMove(col));
      boardEl.appendChild(cell);
    }
  }
  const mine = multiplayer.isMultiplayer() ? (multiplayer.getPlayerIndex() === 0 ? 'R' : 'Y') : 'R';
  statusEl.textContent = gameOver ? 'Spel afgelopen' : currentPlayer === mine ? `Jouw beurt: ${mine === 'R' ? 'Rood' : 'Geel'}` : `Wachten op ${currentPlayer === 'R' ? 'Rood' : 'Geel'}`;
}

function findAvailableRow(col) {
  for (let row = rows - 1; row >= 0; row -= 1) {
    if (!board[row][col]) return row;
  }
  return -1;
}

function checkWinner(boardState, row, col, player) {
  const directions = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let step = 1; step < 4; step += 1) {
      const r = row + dr * step;
      const c = col + dc * step;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      if (boardState[r][c] !== player) break;
      count += 1;
    }
    for (let step = 1; step < 4; step += 1) {
      const r = row - dr * step;
      const c = col - dc * step;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      if (boardState[r][c] !== player) break;
      count += 1;
    }
    if (count >= 4) return true;
  }
  return false;
}

function updateMultiplayer() {
  multiplayer.sendState({ board, currentPlayer, gameOver });
}

function handleMove(col) {
  const mine = multiplayer.isMultiplayer() ? (multiplayer.getPlayerIndex() === 0 ? 'R' : 'Y') : 'R';
  if (gameOver || currentPlayer !== mine) return;
  const row = findAvailableRow(col);
  if (row === -1) return;
  board[row][col] = mine;
  if (checkWinner(board, row, col, mine)) {
    gameOver = true;
    statusEl.textContent = `${mine === 'R' ? 'Rood' : 'Geel'} wint!`;
    updateMultiplayer();
    renderBoard();
    return;
  }
  currentPlayer = currentPlayer === 'R' ? 'Y' : 'R';
  updateMultiplayer();
  renderBoard();
}

function resetGame() {
  if (multiplayer.isMultiplayer() && !multiplayer.isHost()) return;
  board = Array.from({ length: rows }, () => Array(cols).fill(''));
  currentPlayer = 'R';
  gameOver = false;
  updateMultiplayer();
  renderBoard();
}

joinBtn.addEventListener('click', () => {
  multiplayer.joinRoom(roomInput.value.trim() || 'FOUR1');
});
restartBtn.addEventListener('click', resetGame);
renderBoard();
