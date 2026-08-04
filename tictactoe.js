const boardEl = document.getElementById('tttBoard');
const statusEl = document.getElementById('tttStatus');
const roomInput = document.getElementById('tttRoomInput');
const joinBtn = document.getElementById('tttJoinRoom');
const restartBtn = document.getElementById('tttRestart');

const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

let board = Array(9).fill('');
let currentPlayer = 'X';
let gameOver = false;
const multiplayer = window.GameMultiplayer.createMultiplayerController({
  gameName: 'BoterKaasEnEieren',
  onRoomState: (payload) => {
    if (!payload || !payload.state || !payload.state.board) return;
    board = payload.state.board;
    currentPlayer = payload.state.currentPlayer || 'X';
    gameOver = payload.state.gameOver || false;
    renderBoard();
  }
});

function renderBoard() {
  boardEl.innerHTML = '';
  board.forEach((value, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.textContent = value;
    const mySymbol = multiplayer.isMultiplayer() ? (multiplayer.getPlayerIndex() === 0 ? 'X' : 'O') : 'X';
    button.disabled = Boolean(value) || gameOver || (multiplayer.isMultiplayer() && currentPlayer !== mySymbol);
    button.addEventListener('click', () => handleMove(index));
    boardEl.appendChild(button);
  });
  const mySymbol = multiplayer.isMultiplayer() ? (multiplayer.getPlayerIndex() === 0 ? 'X' : 'O') : 'X';
  statusEl.textContent = gameOver ? 'Spel afgelopen' : currentPlayer === mySymbol ? `Jouw beurt (${mySymbol})` : `Wachten op ${currentPlayer}`;
}

function updateMultiplayer() {
  multiplayer.sendState({ board, currentPlayer, gameOver });
}

function getWinner(boardState) {
  for (const [a, b, c] of winningLines) {
    if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
      return boardState[a];
    }
  }
  return null;
}

function handleMove(index) {
  const mySymbol = multiplayer.isMultiplayer() ? (multiplayer.getPlayerIndex() === 0 ? 'X' : 'O') : 'X';
  if (board[index] || gameOver || currentPlayer !== mySymbol) return;
  board[index] = mySymbol;
  const winner = getWinner(board);
  if (winner) {
    gameOver = true;
    statusEl.textContent = `Winnaar: ${winner}`;
    updateMultiplayer();
    renderBoard();
    return;
  }
  if (board.every(Boolean)) {
    gameOver = true;
    statusEl.textContent = 'Gelijkspel';
    updateMultiplayer();
    renderBoard();
    return;
  }
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
  updateMultiplayer();
  renderBoard();
}

function resetGame() {
  if (multiplayer.isMultiplayer() && !multiplayer.isHost()) return;
  board = Array(9).fill('');
  currentPlayer = 'X';
  gameOver = false;
  updateMultiplayer();
  renderBoard();
}

joinBtn.addEventListener('click', () => {
  multiplayer.joinRoom(roomInput.value.trim() || 'TIC1');
});
restartBtn.addEventListener('click', resetGame);
renderBoard();
