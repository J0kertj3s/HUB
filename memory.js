const cards = ['A', 'B', 'C', 'D', 'E', 'F', 'A', 'B', 'C', 'D', 'E', 'F'];
const board = document.getElementById('memoryBoard');
const movesEl = document.getElementById('memoryMoves');
const statusEl = document.getElementById('memoryStatus');
const restartBtn = document.getElementById('memoryRestart');

let state = null;
let localLock = false;
const multiplayer = window.GameMultiplayer.createMultiplayerController({
  gameName: 'memory',
  onRoomState: (payload) => {
    if (payload?.state?.deck) state = payload.state;
    if (multiplayer.isMultiplayer() && !state && multiplayer.isHost()) publishNewGame();
    if (state) render();
  }
});

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function newGameState() { return { deck: shuffle(cards), revealed: [], matched: [], moves: 0, turn: 0, finished: false }; }
function publishNewGame() { state = newGameState(); multiplayer.sendState(state); render(); }
function myTurn() { return !multiplayer.isMultiplayer() || multiplayer.getPlayerIndex() === state.turn; }

function render() {
  board.innerHTML = '';
  state.deck.forEach((value, index) => {
    const visible = state.revealed.includes(index) || state.matched.includes(index);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `memory-card${visible ? ' flipped' : ''}`;
    button.textContent = visible ? value : '?';
    button.disabled = visible || state.finished || !myTurn() || localLock;
    button.addEventListener('click', () => chooseCard(index));
    board.appendChild(button);
  });
  movesEl.textContent = state.moves;
  if (state.finished) statusEl.textContent = 'Alle paren gevonden!';
  else if (multiplayer.isMultiplayer()) statusEl.textContent = myTurn() ? 'Jouw beurt: kies twee kaarten.' : `Wachten op ${multiplayer.getPlayers()[state.turn]?.name || 'speler'}...`;
  else statusEl.textContent = 'Zoek een paar';
}

function chooseCard(index) {
  if (!state || !myTurn() || localLock || state.revealed.includes(index) || state.matched.includes(index)) return;
  state = { ...state, revealed: [...state.revealed, index] };
  if (state.revealed.length < 2) { multiplayer.sendState(state); render(); return; }
  const [first, second] = state.revealed;
  const match = state.deck[first] === state.deck[second];
  state.moves += 1;
  if (match) {
    state.matched = [...state.matched, first, second];
    state.revealed = [];
    state.finished = state.matched.length === state.deck.length;
    const players = Math.max(1, multiplayer.getPlayers().length);
    if (multiplayer.isMultiplayer()) state.turn = (state.turn + 1) % players;
    multiplayer.sendState(state); render(); return;
  }
  localLock = true;
  multiplayer.sendState(state); render();
  setTimeout(() => {
    state = { ...state, revealed: [], turn: multiplayer.isMultiplayer() ? (state.turn + 1) % Math.max(1, multiplayer.getPlayers().length) : state.turn };
    localLock = false;
    multiplayer.sendState(state); render();
  }, 750);
}

restartBtn.addEventListener('click', () => {
  if (multiplayer.isMultiplayer() && !multiplayer.isHost()) return;
  publishNewGame();
});

state = multiplayer.isMultiplayer() ? null : newGameState();
if (state) render();
