const statusEl = document.getElementById('rpsStatus');
const choices = document.querySelectorAll('.choice-btn');
const roomInput = document.getElementById('rpsRoomInput');
const joinBtn = document.getElementById('rpsJoinRoom');

let round = { firstChoice: null, secondChoice: null, result: null };
const multiplayer = window.GameMultiplayer.createMultiplayerController({
  gameName: 'rps',
  onRoomState: (payload) => {
    if (payload?.state?.firstChoice !== undefined) round = payload.state;
    renderStatus();
  }
});

function winner(first, second) {
  if (first === second) return 'Gelijkspel';
  const firstWins = (first === 'rock' && second === 'scissors') || (first === 'paper' && second === 'rock') || (first === 'scissors' && second === 'paper');
  return firstWins ? 'Speler 1 wint!' : 'Speler 2 wint!';
}

function renderStatus() {
  if (!multiplayer.isMultiplayer()) return;
  const index = multiplayer.getPlayerIndex();
  if (round.result) { statusEl.textContent = `${round.firstChoice} tegen ${round.secondChoice}: ${round.result}`; return; }
  if (index === 0 && !round.firstChoice) statusEl.textContent = 'Kies steen, papier of schaar.';
  else if (index === 1 && round.firstChoice && !round.secondChoice) statusEl.textContent = 'Jij bent aan zet. Kies je antwoord.';
  else statusEl.textContent = 'Wachten op de andere speler...';
}

choices.forEach((button) => {
  button.addEventListener('click', () => {
    const choice = button.dataset.choice;
    if (!multiplayer.isMultiplayer()) {
      statusEl.textContent = `Jij koos ${choice}. Kies in multiplayer voor een duel.`;
      return;
    }
    const index = multiplayer.getPlayerIndex();
    if (index === 0 && !round.firstChoice) round = { firstChoice: choice, secondChoice: null, result: null };
    else if (index === 1 && round.firstChoice && !round.secondChoice) round = { ...round, secondChoice: choice, result: winner(round.firstChoice, choice) };
    else return;
    multiplayer.sendState(round);
    renderStatus();
  });
});

joinBtn?.addEventListener('click', () => multiplayer.joinRoom(roomInput?.value.trim() || 'RPS1'));
