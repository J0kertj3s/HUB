const MAX_HP = 100;
const state = {
  playerHp: 100,
  enemyHp: 100,
  playerEnergy: 0,
  enemyEnergy: 0,
  round: 1,
  gameOver: false,
  log: []
};

const playerHpBar = document.getElementById('playerHpBar');
const playerHpText = document.getElementById('playerHpText');
const enemyHpBar = document.getElementById('enemyHpBar');
const enemyHpText = document.getElementById('enemyHpText');
const playerEnergyEl = document.getElementById('playerEnergy');
const roundCountEl = document.getElementById('roundCount');
const battleLog = document.getElementById('battleLog');
const restartBtn = document.getElementById('restartArena');
let multiplayerReady = false;
const multiplayer = window.GameMultiplayer.createMultiplayerController({
  gameName: 'arena',
  onRoomState: (payload) => {
    if (payload?.state?.playerHp !== undefined) {
      Object.assign(state, payload.state);
      updateUI();
      battleLog.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join('');
    } else if (!multiplayerReady && multiplayer.isHost()) {
      multiplayerReady = true;
      resetArena();
    }
  }
});

function addLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 6);
  battleLog.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join('');
}

function updateUI() {
  const playerPercent = Math.max(0, (state.playerHp / MAX_HP) * 100);
  const enemyPercent = Math.max(0, (state.enemyHp / MAX_HP) * 100);

  playerHpBar.style.width = `${playerPercent}%`;
  enemyHpBar.style.width = `${enemyPercent}%`;
  playerHpText.textContent = `${state.playerHp} / ${MAX_HP}`;
  enemyHpText.textContent = `${state.enemyHp} / ${MAX_HP}`;
  playerEnergyEl.textContent = state.playerEnergy;
  roundCountEl.textContent = state.round;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function applyDamage(target, amount) {
  return clamp(target - amount, 0, MAX_HP);
}

function playerAction(type) {
  if (state.gameOver) return;

  if (multiplayer.isMultiplayer()) {
    const index = multiplayer.getPlayerIndex();
    if (state.turn === undefined) state.turn = 0;
    if (state.turn !== index) return;
    const ownHp = index === 0 ? 'playerHp' : 'enemyHp';
    const opponentHp = index === 0 ? 'enemyHp' : 'playerHp';
    const ownEnergy = index === 0 ? 'playerEnergy' : 'enemyEnergy';
    if (type === 'attack') state[opponentHp] = applyDamage(state[opponentHp], 12 + Math.floor(Math.random() * 9));
    if (type === 'special') {
      if (state[ownEnergy] < 2) { addLog('Niet genoeg energie voor een special move.'); updateUI(); return; }
      state[opponentHp] = applyDamage(state[opponentHp], 24 + Math.floor(Math.random() * 10));
      state[ownEnergy] -= 2;
    }
    if (type === 'heal') state[ownHp] = clamp(state[ownHp] + 18, 0, MAX_HP);
    if (type !== 'special') state[ownEnergy] = clamp(state[ownEnergy] + 1, 0, 5);
    addLog(`${multiplayer.getPlayers()[index]?.name || 'Speler'} gebruikte ${type}.`);
    if (state[opponentHp] <= 0) { state.gameOver = true; addLog('De ronde is afgelopen.'); }
    state.turn = (index + 1) % 2;
    state.round += 1;
    multiplayer.sendState(state);
    updateUI();
    return;
  }

  let enemyDamage = 0;
  let playerHeal = 0;
  let playerDefense = false;

  if (type === 'attack') {
    enemyDamage = 12 + Math.floor(Math.random() * 9);
    state.enemyHp = applyDamage(state.enemyHp, enemyDamage);
    state.playerEnergy = clamp(state.playerEnergy + 1, 0, 5);
    addLog(`Je valt aan en doet ${enemyDamage} schade.`);
  }

  if (type === 'special') {
    if (state.playerEnergy < 2) {
      addLog('Je hebt niet genoeg energie voor je special move.');
      enemyTurn();
      return;
    }

    enemyDamage = 24 + Math.floor(Math.random() * 10);
    state.enemyHp = applyDamage(state.enemyHp, enemyDamage);
    state.playerEnergy = clamp(state.playerEnergy - 2, 0, 5);
    addLog(`Je gebruikt Special: ${enemyDamage} schade!`);
  }

  if (type === 'heal') {
    playerHeal = 16 + Math.floor(Math.random() * 10);
    state.playerHp = clamp(state.playerHp + playerHeal, 0, MAX_HP);
    state.playerEnergy = clamp(state.playerEnergy + 1, 0, 5);
    addLog(`Je geneest ${playerHeal} levens.`);
  }

  if (type === 'defend') {
    playerDefense = true;
    state.playerEnergy = clamp(state.playerEnergy + 1, 0, 5);
    addLog('Je verdedigt je en vermindert de volgende aanval.');
  }

  if (state.enemyHp <= 0) {
    state.gameOver = true;
    addLog('Je hebt de computer verslagen!');
    updateUI();
    return;
  }

  enemyTurn(playerDefense);
}

function chooseEnemyAction() {
  const chooser = Math.random();
  if (state.enemyEnergy >= 2 && chooser > 0.7) return 'special';
  if (chooser > 0.4) return 'attack';
  return 'heal';
}

function enemyTurn(playerDefense) {
  if (state.gameOver) return;

  const action = chooseEnemyAction();
  let damage = 0;
  let heal = 0;

  if (action === 'attack') {
    damage = 8 + Math.floor(Math.random() * 12);
    if (playerDefense) {
      damage = Math.floor(damage / 2);
    }
    state.playerHp = applyDamage(state.playerHp, damage);
    state.enemyEnergy = clamp(state.enemyEnergy + 1, 0, 5);
    addLog(`Computer valt aan voor ${damage} schade.`);
  }

  if (action === 'special') {
    damage = 18 + Math.floor(Math.random() * 16);
    if (playerDefense) {
      damage = Math.floor(damage / 2);
    }
    state.playerHp = applyDamage(state.playerHp, damage);
    state.enemyEnergy = clamp(state.enemyEnergy - 2, 0, 5);
    addLog(`Computer gebruikt Special: ${damage} schade!`);
  }

  if (action === 'heal') {
    heal = 12 + Math.floor(Math.random() * 10);
    state.enemyHp = clamp(state.enemyHp + heal, 0, MAX_HP);
    state.enemyEnergy = clamp(state.enemyEnergy + 1, 0, 5);
    addLog(`Computer geneest ${heal} levens.`);
  }

  if (state.playerHp <= 0) {
    state.gameOver = true;
    addLog('Je bent verslagen door de computer.');
  }

  state.round += 1;
  updateUI();
}

function resetArena() {
  if (multiplayer.isMultiplayer() && !multiplayer.isHost()) return;
  state.playerHp = 100;
  state.enemyHp = 100;
  state.playerEnergy = 0;
  state.enemyEnergy = 0;
  state.round = 1;
  state.gameOver = false;
  state.log = [];
  state.turn = 0;
  addLog('Nieuwe ronde gestart. Kies je move.');
  updateUI();
  if (multiplayer.isMultiplayer()) multiplayer.sendState(state);
}

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    playerAction(button.dataset.action);
    updateUI();
  });
});

restartBtn.addEventListener('click', resetArena);
resetArena();
