const statusEl = document.getElementById('simonStatus');
const pads = document.querySelectorAll('.pad');
const startBtn = document.getElementById('simonStart');
const roomInput = document.getElementById('simonRoomInput');
const joinBtn = document.getElementById('simonJoinRoom');

let game = { sequence: [], turn: 0, progress: 0, message: '' };
let isShowing = false;
let shownSignature = '';
const multiplayer = window.GameMultiplayer.createMultiplayerController({
  gameName: 'simon',
  onRoomState: (payload) => {
    if (!payload) return;
    if (payload.state?.sequence) game = payload.state;
    if (multiplayer.isMultiplayer() && !game.sequence.length && multiplayer.isHost()) startRound();
    renderGame();
  }
});

function currentTurnName() { return multiplayer.getPlayers()[game.turn]?.name || 'speler'; }
function randomPad() { return Math.floor(Math.random() * 4); }

function startRound() {
  game = { sequence: [...game.sequence, randomPad()], turn: game.turn % Math.max(1, multiplayer.getPlayers().length), progress: 0, message: 'Kijk goed naar de reeks...' };
  multiplayer.sendState(game);
  playSequence();
}

function playSequence() {
  const signature = `${game.sequence.join('')}:${game.turn}`;
  if (signature === shownSignature || !game.sequence.length) return;
  shownSignature = signature;
  isShowing = true;
  game.sequence.forEach((value, index) => {
    setTimeout(() => {
      pads[value].style.transform = 'scale(0.92)';
      setTimeout(() => { pads[value].style.transform = 'scale(1)'; }, 240);
      if (index === game.sequence.length - 1) setTimeout(() => { isShowing = false; renderGame(); }, 350);
    }, (index + 1) * 480);
  });
}

function renderGame() {
  if (!multiplayer.isMultiplayer()) return;
  const isMyTurn = multiplayer.getPlayerIndex() === game.turn;
  statusEl.textContent = isShowing ? 'Kijk naar de reeks...' : isMyTurn ? 'Jouw beurt: herhaal de reeks.' : `Wachten op ${currentTurnName()}...`;
  playSequence();
}

pads.forEach((button) => {
  button.addEventListener('click', () => {
    if (!multiplayer.isMultiplayer()) return;
    if (isShowing || multiplayer.getPlayerIndex() !== game.turn) return;
    const value = Number(button.dataset.pad);
    if (value !== game.sequence[game.progress]) {
      game = { sequence: [], turn: (game.turn + 1) % multiplayer.getPlayers().length, progress: 0, message: 'Fout gekozen.' };
      shownSignature = '';
      multiplayer.sendState(game);
      return;
    }
    game.progress += 1;
    if (game.progress === game.sequence.length) {
      game.turn = (game.turn + 1) % multiplayer.getPlayers().length;
      game.progress = 0;
      shownSignature = '';
      setTimeout(startRound, 500);
    } else {
      multiplayer.sendState(game);
    }
  });
});

startBtn.addEventListener('click', () => {
  if (multiplayer.isMultiplayer()) { if (multiplayer.isHost()) startRound(); return; }
  statusEl.textContent = 'Start een multiplayerlobby om Simon om beurten te spelen.';
});
joinBtn?.addEventListener('click', () => multiplayer.joinRoom(roomInput?.value.trim() || 'SIMON1'));
