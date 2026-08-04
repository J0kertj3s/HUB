const trioBoard = document.getElementById('trioBoard');
const trioStatus = document.getElementById('trioStatus');
const trioRestart = document.getElementById('trioRestart');
const trioValues = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C', 'D', 'D', 'D'];
let trioState = null;
let trioTimer = null;
const trioMultiplayer = window.GameMultiplayer.createMultiplayerController({
  gameName: 'trio',
  onRoomState: (payload) => {
    if (payload?.state?.deck) trioState = payload.state;
    if (trioMultiplayer.isMultiplayer() && !trioState && trioMultiplayer.isHost()) startTrio();
    if (trioState) renderTrio();
  }
});

function shuffled(values) { return [...values].sort(() => Math.random() - 0.5); }
function newTrioState() { return { deck: shuffled(trioValues), revealed: [], matched: [], turn: 0, scores: {}, finished: false }; }
function activeTrioPlayer() { return !trioMultiplayer.isMultiplayer() || trioMultiplayer.getPlayerIndex() === trioState.turn; }
function startTrio() { trioState = newTrioState(); trioMultiplayer.sendState(trioState); renderTrio(); }

function renderTrio() {
  trioBoard.innerHTML = '';
  trioState.deck.forEach((value, index) => {
    const open = trioState.revealed.includes(index) || trioState.matched.includes(index);
    const card = document.createElement('button');
    card.className = `trio-card${open ? ' open' : ''}`;
    card.textContent = open ? value : '?';
    card.disabled = open || trioState.finished || !activeTrioPlayer();
    card.addEventListener('click', () => pickTrioCard(index));
    trioBoard.appendChild(card);
  });
  if (trioState.finished) trioStatus.textContent = 'Alle trio’s zijn gevonden.';
  else if (trioMultiplayer.isMultiplayer()) trioStatus.textContent = activeTrioPlayer() ? 'Jouw beurt: vind een trio.' : `Wachten op ${trioMultiplayer.getPlayers()[trioState.turn]?.name || 'speler'}...`;
  else trioStatus.textContent = 'Vind drie gelijke kaarten.';
}

function pickTrioCard(index) {
  if (!activeTrioPlayer() || trioState.revealed.includes(index) || trioTimer) return;
  trioState = { ...trioState, revealed: [...trioState.revealed, index] };
  if (trioState.revealed.length < 3) { trioMultiplayer.sendState(trioState); renderTrio(); return; }
  const values = trioState.revealed.map((cardIndex) => trioState.deck[cardIndex]);
  if (new Set(values).size === 1) {
    trioState.matched = [...trioState.matched, ...trioState.revealed];
    trioState.revealed = [];
    trioState.finished = trioState.matched.length === trioState.deck.length;
    trioMultiplayer.sendState(trioState); renderTrio(); return;
  }
  trioTimer = setTimeout(() => {
    trioState = { ...trioState, revealed: [], turn: (trioState.turn + 1) % Math.max(1, trioMultiplayer.getPlayers().length) };
    trioTimer = null;
    trioMultiplayer.sendState(trioState); renderTrio();
  }, 800);
  trioMultiplayer.sendState(trioState); renderTrio();
}

trioRestart.addEventListener('click', () => { if (!trioMultiplayer.isMultiplayer() || trioMultiplayer.isHost()) startTrio(); });
trioState = trioMultiplayer.isMultiplayer() ? null : newTrioState();
if (trioState) renderTrio();
