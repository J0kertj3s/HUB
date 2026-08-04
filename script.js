// Game Hub data source
const knownGameCatalog = [
  {
    name: "Snake",
    description: "Klassieke Snake met snelle reflexes en live multiplayer-room.",
    image: "images/snake.svg",
    category: "Arcade",
    url: "snake.html"
  },
  {
    name: "Tetris",
    description: "Stapel blokken, maak lijnen en zet je score op de board.",
    image: "images/tetris.svg",
    category: "Puzzel",
    url: "tetris.html"
  },
  {
    name: "Memory Match",
    description: "Vind alle paren en train je focus in een snelle ronde.",
    image: "images/memory.svg",
    category: "Puzzel",
    url: "memory.html"
  },
  {
    name: "Pixel Arena",
    description: "Vechten in een kleurrijke arena met snelle rondes en duelmodus.",
    image: "images/arena.svg",
    category: "Multiplayer",
    url: "arena.html"
  },
  {
    name: "Boter Kaas en Eieren",
    description: "Tic-tac-toe in een snelle 1-vs-1 multiplayer-room.",
    image: "images/tictactoe.svg",
    category: "Multiplayer",
    url: "tictactoe.html"
  },
  {
    name: "Connect Four",
    description: "Vier op een rij en versla je tegenstander in de juiste room.",
    image: "images/connect4.svg",
    category: "Multiplayer",
    url: "connect4.html"
  },
  {
    name: "Rock Paper Scissors",
    description: "Een snelle duelversie voor twee spelers met live room-sync.",
    image: "images/rps.svg",
    category: "Multiplayer",
    url: "rps.html"
  },
  {
    name: "Simon Says",
    description: "Herhaal de reeks, reageer precies en win de ronde.",
    image: "images/simon.svg",
    category: "Multiplayer",
    url: "simon.html"
  },
  {
    name: "Quiz Duel",
    description: "Beam een vraag naar je tegenstander en daag hem uit op snelheid.",
    image: "images/quiz-duel.svg",
    category: "Multiplayer",
    url: "quiz-duel.html"
  },
  {
    name: "Trio",
    description: "Verzamel trio's en speel op tactiek in een compacte kaart-game.",
    image: "images/trio.svg",
    category: "Arcade",
    url: "trio.html"
  }
];

const defaultGames = [...knownGameCatalog];

const defaultUsers = [
  { username: "alice", password: "123456", role: "user", name: "Alice", blocked: false, blockReason: "" },
  { username: "bob", password: "123456", role: "user", name: "Bob", blocked: false, blockReason: "" },
  { username: "admin", password: "admin123", role: "admin", name: "Admin", blocked: false, blockReason: "" }
];

const storageKeys = {
  users: "gameHubUsers",
  activeUser: "gameHubActiveUser",
  favorites: "gameHubFavorites",
  games: "gameHubGames",
  settings: "gameHubSettings"
};

const defaultSettings = {
  title: "Game Hub",
  accent: "blue"
};

const state = {
  search: "",
  view: "all"
};

const lobbySocket = window.io ? window.io() : null;
const selectedLobbyGame = { game: null };
// Every game uses the same entry flow; capacity remains centrally configured in server.js.
const multiplayerGames = new Set(["arena", "connect4", "memory", "quizduel", "rps", "simon", "snake", "tetris", "tictactoe", "trio"]);

const gameGrid = document.getElementById("gameGrid");
const searchInput = document.getElementById("searchInput");
const visibleCount = document.getElementById("visibleCount");
const viewButtons = document.querySelectorAll(".view-btn");
const currentUserLabel = document.getElementById("currentUserLabel");
const logoutBtn = document.getElementById("logoutBtn");
const appTitle = document.getElementById("appTitle");
const openAdminPanelBtn = document.getElementById("openAdminPanel");
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const addGameModal = document.getElementById("addGameModal");
const addGameForm = document.getElementById("addGameForm");
const adminModal = document.getElementById("adminModal");
const userList = document.getElementById("userList");
const gameList = document.getElementById("gameList");
const addUserForm = document.getElementById("addUserForm");
const settingsForm = document.getElementById("settingsForm");
const siteTitleInput = document.getElementById("siteTitleInput");
const themeAccentSelect = document.getElementById("themeAccentSelect");
const accountModal = document.getElementById("accountModal");
const accountForm = document.getElementById("accountForm");
const accountMessage = document.getElementById("accountMessage");
const accountUsername = document.getElementById("accountUsername");
const accountPassword = document.getElementById("accountPassword");
const currentPasswordInput = document.getElementById("currentPassword");
const gameLobbyModal = document.getElementById("gameLobbyModal");
const lobbyGameTitle = document.getElementById("lobbyGameTitle");
const lobbyRoomCode = document.getElementById("lobbyRoomCode");
const computerModePanel = document.getElementById("computerModePanel");
const playerModePanel = document.getElementById("playerModePanel");
const waitingRoomPanel = document.getElementById("waitingRoomPanel");
const lobbyHostName = document.getElementById("lobbyHostName");
const lobbyRoomCodeDisplay = document.getElementById("lobbyRoomCodeDisplay");
const lobbyPlayerList = document.getElementById("lobbyPlayerList");
const lobbyPlayerCount = document.getElementById("lobbyPlayerCount");
const lobbySubmitBtn = document.getElementById("lobbySubmitBtn");
const lobbyRoomSubmitBtn = document.getElementById("lobbyRoomSubmitBtn");
const lobbyStartBtn = document.getElementById("lobbyStartBtn");
const lobbyLeaveBtn = document.getElementById("lobbyLeaveBtn");
const startComputerGameBtn = document.getElementById("startComputerGameBtn");
const createLobbyRoomBtn = document.getElementById("createLobbyRoomBtn");
const joinLobbyRoomBtn = document.getElementById("joinLobbyRoomBtn");
const lobbyModeButtons = document.querySelectorAll(".lobby-mode-btn");

function normalizeUser(user) {
  return {
    username: user.username,
    password: user.password,
    role: user.role || "user",
    name: user.name || user.username,
    blocked: Boolean(user.blocked),
    blockReason: user.blockReason || ""
  };
}

function loadUsers() {
  const stored = localStorage.getItem(storageKeys.users);
  if (!stored) {
    localStorage.setItem(storageKeys.users, JSON.stringify(defaultUsers));
    return defaultUsers.map(normalizeUser);
  }
  return JSON.parse(stored).map(normalizeUser);
}

function saveUsers(users) {
  localStorage.setItem(storageKeys.users, JSON.stringify(users.map(normalizeUser)));
}

function normalizeGame(game) {
  if (!game || typeof game !== "object") return null;

  return {
    name: String(game.name || "Onbekend spel").trim(),
    description: String(game.description || "Geen beschrijving").trim(),
    image: String(game.image || "images/default.svg").trim(),
    category: String(game.category || "Overig").trim(),
    url: String(game.url || "").trim(),
    blocked: Boolean(game.blocked),
    blockReason: String(game.blockReason || "").trim()
  };
}

function loadGames() {
  const stored = localStorage.getItem(storageKeys.games);
  const parsed = stored ? JSON.parse(stored) : defaultGames;
  const normalized = (Array.isArray(parsed) ? parsed : []).map(normalizeGame).filter(Boolean);
  const byUrl = new Map();

  knownGameCatalog.forEach((game) => {
    const match = normalized.find((entry) => entry.url === game.url);
    if (match) {
      byUrl.set(game.url, match);
      return;
    }
    byUrl.set(game.url, { ...game, blocked: false, blockReason: "" });
  });

  normalized.forEach((game) => {
    if (!game.url || !knownGameCatalog.some((entry) => entry.url === game.url)) {
      byUrl.set(game.url || `custom-${Date.now()}`, game);
    }
  });

  const mergedGames = [...byUrl.values()].map(normalizeGame).filter(Boolean);
  localStorage.setItem(storageKeys.games, JSON.stringify(mergedGames));
  return mergedGames;
}

async function loadServerGameFiles() {
  try {
    const response = await fetch("/api/games");
    if (!response.ok) return [];
    const files = await response.json();
    return Array.isArray(files) ? files : [];
  } catch (error) {
    return [];
  }
}

function saveGames(items) {
  const list = (Array.isArray(items) ? items : []).map(normalizeGame).filter(Boolean);
  localStorage.setItem(storageKeys.games, JSON.stringify(list));
}

function syncBrokenGames() {
  const games = loadGames();
  const validUrls = new Set(
    [
      ...games.map((game) => (game.url || "").toLowerCase()),
      ...knownGameCatalog.map((game) => game.url.toLowerCase())
    ].filter((value) => value.endsWith(".html"))
  );

  const remaining = games.filter((game) => {
    if (!game.url) return false;
    const url = (game.url.startsWith("/") ? game.url.slice(1) : game.url).toLowerCase();
    if (url === "index.html") return false;
    if (!url.endsWith(".html")) return false;
    return validUrls.has(url);
  });

  saveGames(remaining);
  return remaining;
}

async function refreshGameCatalogFromServer() {
  const files = await loadServerGameFiles();
  const storedGames = loadGames();
  const merged = new Map();

  files.forEach((file) => {
    const normalized = normalizeGame({
      name: file.name,
      description: `Spel beschikbaar in de catalogus: ${file.name}`,
      image: file.image || "images/default.svg",
      category: "Arcade",
      url: file.url,
      blocked: false,
      blockReason: ""
    });

    if (normalized) merged.set(normalized.url.toLowerCase(), normalized);
  });

  storedGames.forEach((game) => {
    if (!game.url) return;
    merged.set((game.url || "").toLowerCase(), { ...game, url: game.url });
  });

  const finalGames = Array.from(merged.values())
    .filter((game) => game.url && game.url.toLowerCase().endsWith(".html") && game.url.toLowerCase() !== "index.html")
    .map((game) => ({
      ...game,
      name: game.name || "Onbekend spel",
      description: game.description || "Geen beschrijving",
      image: game.image || "images/default.svg",
      category: game.category || "Overig",
      blocked: Boolean(game.blocked),
      blockReason: String(game.blockReason || "")
    }));

  saveGames(finalGames);
  return finalGames;
}

function loadSettings() {
  const stored = localStorage.getItem(storageKeys.settings);
  if (!stored) {
    localStorage.setItem(storageKeys.settings, JSON.stringify(defaultSettings));
    return { ...defaultSettings };
  }
  return { ...defaultSettings, ...JSON.parse(stored) };
}

function saveSettings(settings) {
  localStorage.setItem(storageKeys.settings, JSON.stringify(settings));
}

function getCurrentUser() {
  const username = localStorage.getItem(storageKeys.activeUser);
  if (!username) return null;
  const users = loadUsers();
  return users.find((user) => user.username === username) || null;
}

function setCurrentUser(username) {
  localStorage.setItem(storageKeys.activeUser, username);
}

function clearCurrentUser() {
  localStorage.removeItem(storageKeys.activeUser);
}

function getFavorites() {
  const user = getCurrentUser();
  if (!user) return [];
  const key = `${storageKeys.favorites}_${user.username}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

function saveFavorites(items) {
  const user = getCurrentUser();
  if (!user) return;
  const key = `${storageKeys.favorites}_${user.username}`;
  localStorage.setItem(key, JSON.stringify(items));
}

function isFavorite(gameName) {
  return getFavorites().includes(gameName);
}

function toggleFavorite(gameName) {
  const favorites = getFavorites();
  const hasFavorite = favorites.includes(gameName);
  const updatedFavorites = hasFavorite
    ? favorites.filter((name) => name !== gameName)
    : [...favorites, gameName];

  saveFavorites(updatedFavorites);
  renderGames();
}

function applySettingsToApp() {
  const settings = loadSettings();
  appTitle.textContent = settings.title || "Game Hub";
  document.title = settings.title || "Game Hub";

  const root = document.documentElement;
  if (settings.accent === "purple") {
    root.style.setProperty("--accent-1", "#b38cff");
    root.style.setProperty("--accent-2", "#7b5cff");
  } else if (settings.accent === "pink") {
    root.style.setProperty("--accent-1", "#ff7ddc");
    root.style.setProperty("--accent-2", "#ff5cb8");
  } else {
    root.style.setProperty("--accent-1", "#5ae2ff");
    root.style.setProperty("--accent-2", "#a86cff");
  }
}

function updateAdminVisibility() {
  const user = getCurrentUser();
  const isAdmin = user && user.role === "admin";
  const adminButton = document.getElementById("openAdminPanel");
  const addGameButton = document.getElementById("openAddGameModal");
  adminButton.classList.toggle("hidden", !isAdmin);
  if (addGameButton) {
    addGameButton.classList.toggle("hidden", !isAdmin);
  }
}

function getGameKeyFromUrl(url) {
  return String(url || "").replace(/\.html$/i, "").replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function setLobbyMode(mode) {
  selectedLobbyGame.mode = mode;
  document.getElementById("lobbyModeDescription").textContent = mode === "computer"
    ? "Speel deze ronde zelfstandig tegen de computer."
    : "Ga verder om een spel te hosten of met een lobbycode deel te nemen.";

  lobbyModeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lobbyMode === mode);
  });
}

function isMultiplayerGame(game) {
  return multiplayerGames.has(getGameKeyFromUrl(game?.url));
}

function generateRoomCode() {
  const prefix = selectedLobbyGame.game ? getGameKeyFromUrl(selectedLobbyGame.game.url).slice(0, 3).toUpperCase() : "GAM";
  return `${prefix}${Math.random().toString(36).slice(2, 6).toUpperCase()}`.slice(0, 8);
}

function renderLobbyPlayers(payload) {
  if (!payload || !Array.isArray(payload.players)) {
    lobbyPlayerList.innerHTML = "";
    return;
  }

  lobbyPlayerList.innerHTML = "";

  payload.players.forEach((player) => {
    const item = document.createElement("li");
    item.className = "lobby-player-item";
    item.innerHTML = `
      <div class="user-card-main">
        <strong>${player.name}</strong>
        <span class="user-role">${player.isHost ? "Host" : "Speler"}</span>
      </div>
    `;
    lobbyPlayerList.appendChild(item);
  });

  const isHost = lobbySocket && lobbySocket.id && payload.hostId === lobbySocket.id;
  lobbyPlayerCount.textContent = payload.maxPlayers === null
    ? `${payload.players.length} spelers (geen limiet)`
    : `${payload.players.length}/${payload.maxPlayers} spelers`;
  lobbyStartBtn.classList.toggle("hidden", !isHost);
  document.getElementById("lobbyWaitingMessage").classList.toggle("hidden", isHost);
  lobbyStartBtn.disabled = !isHost || payload.players.length < 2;
  lobbyStartBtn.textContent = isHost
    ? payload.players.length < 2
      ? `Wachten op ${2 - payload.players.length} speler(s)`
      : "Start spel"
    : "Start spel";
}

function openLobbyForGame(game) {
  if (!game) return;
  selectedLobbyGame.game = game;
  selectedLobbyGame.mode = "computer";
  selectedLobbyGame.role = "host";
  lobbyGameTitle.textContent = game.name;
  lobbyRoomCode.value = "";
  lobbyStartBtn.disabled = true;
  lobbyRoomCodeDisplay.textContent = "-";
  waitingRoomPanel.classList.add("hidden");
  playerModePanel.classList.add("hidden");
  computerModePanel.classList.remove("hidden");
  setLobbyMode("computer");
  gameLobbyModal.classList.remove("hidden");
}

function closeLobbyForGame() {
  gameLobbyModal.classList.add("hidden");
  waitingRoomPanel.classList.add("hidden");
  playerModePanel.classList.add("hidden");
  computerModePanel.classList.remove("hidden");
  if (lobbySocket && selectedLobbyGame.game) {
    const roomCode = lobbyRoomCodeDisplay.textContent.trim();
    if (roomCode && roomCode !== "-") {
      lobbySocket.emit("lobby:leave");
    }
  }
  selectedLobbyGame.game = null;
}

function startGameFromLobby() {
  const game = selectedLobbyGame.game;
  if (!game) return;

  const gameKey = getGameKeyFromUrl(game.url);
  const roomCode = (lobbyRoomCodeDisplay.textContent || lobbyRoomCode.value || "").trim();
  if (!roomCode || roomCode === "-") {
    alert("Er is nog geen actieve room gekozen.");
    return;
  }

  if (lobbySocket) lobbySocket.emit("lobby:start");
}

function joinOrCreateLobbyRoom(mode) {
  const user = getCurrentUser();
  if (!user) {
    gameLobbyModal.classList.add("hidden");
    showLogin();
    return;
  }

  const game = selectedLobbyGame.game;
  if (!game) return;

  const gameKey = getGameKeyFromUrl(game.url);
  const code = (lobbyRoomCode.value || "").trim();
  const payload = {
    game: gameKey,
    roomId: code,
    username: user.name || user.username
  };

  if (!lobbySocket) {
    window.location.href = `${game.url}?room=${encodeURIComponent(code)}&game=${encodeURIComponent(gameKey)}`;
    return;
  }

  if (mode === "create") {
    lobbySocket.emit("lobby:create", payload);
  } else {
    if (!code) {
      alert("Vul een lobbycode in om deel te nemen.");
      return;
    }
    lobbySocket.emit("lobby:join", payload);
  }
}

function setLobbyRole(role) {
  selectedLobbyGame.role = role;
  document.querySelectorAll(".lobby-role-btn").forEach((button) => {
    button.classList.toggle("is-active", button.id === (role === "host" ? "createLobbyRoomBtn" : "joinLobbyRoomBtn"));
  });
  document.getElementById("lobbyCodeLabel").classList.toggle("hidden", role !== "join");
  lobbyRoomCode.required = role === "join";
}

function continueFromGameMode() {
  const game = selectedLobbyGame.game;
  if (!game) return;
  if (selectedLobbyGame.mode === "computer") {
    window.location.href = game.url;
    return;
  }
  computerModePanel.classList.add("hidden");
  playerModePanel.classList.remove("hidden");
  setLobbyRole("host");
}

function showLogin() {
  document.body.classList.add("logged-out");
  loginModal.classList.remove("hidden");
  loginModal.classList.add("visible");
}

function hideLogin() {
  document.body.classList.remove("logged-out");
  loginModal.classList.add("hidden");
  loginModal.classList.remove("visible");
}

function showApp() {
  const user = getCurrentUser();
  if (!user) {
    showLogin();
    return;
  }

  currentUserLabel.textContent = `Ingelogd als ${user.name || user.username}`;
  updateAdminVisibility();
  hideLogin();
  renderGames();
}

function handleLogin(event) {
  event.preventDefault();

  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();
  const users = loadUsers();
  const match = users.find((user) => user.username === username);

  if (!match) {
    loginError.textContent = "Gebruikersnaam of wachtwoord is onjuist.";
    return;
  }

  if (match.blocked) {
    loginError.textContent = `Account geblokkeerd. Reden: ${match.blockReason || "Geen reden opgegeven"}`;
    return;
  }

  if (match.password !== password) {
    loginError.textContent = "Gebruikersnaam of wachtwoord is onjuist.";
    return;
  }

  setCurrentUser(match.username);
  loginError.textContent = "";
  loginForm.reset();
  showApp();
}

function logout() {
  clearCurrentUser();
  currentUserLabel.textContent = "Niet ingelogd";
  state.search = "";
  searchInput.value = "";
  renderGames();
  showLogin();
}

function getVisibleGames() {
  const searchText = state.search.trim().toLowerCase();
  const user = getCurrentUser();

  return syncBrokenGames().filter((game) => {
    if (game.blocked) return false;

    const matchesSearch =
      !searchText ||
      game.name.toLowerCase().includes(searchText) ||
      game.description.toLowerCase().includes(searchText) ||
      game.category.toLowerCase().includes(searchText);

    const matchesView =
      state.view !== "favorites" ||
      (user && getFavorites().includes(game.name));

    return matchesSearch && matchesView;
  });
}

function createGameCard(game) {
  const article = document.createElement("article");
  article.className = "game-card";

  const favoriteLabel = isFavorite(game.name)
    ? "Verwijder uit favorieten"
    : "Voeg toe aan favorieten";

  article.innerHTML = `
    <div class="card-media">
      <img src="${game.image}" alt="${game.name}" loading="lazy" />
    </div>
    <div class="card-body">
      <div class="meta-row">
        <span class="category-tag">${game.category}</span>
        <button class="favorite-btn ${isFavorite(game.name) ? "active" : ""}" type="button" data-game-name="${game.name}" aria-label="${favoriteLabel}">
          ♥
        </button>
      </div>
      <div>
        <h3>${game.name}</h3>
      </div>
      <p>${game.description}</p>
      <div class="card-footer">
        <span class="status-pill">Live</span>
        <a class="play-btn" href="${game.url}" data-game-url="${game.url}">Speel</a>
      </div>
    </div>
  `;

  const favoriteButton = article.querySelector(".favorite-btn");
  favoriteButton.addEventListener("click", () => toggleFavorite(game.name));

  const playButton = article.querySelector(".play-btn");
  playButton.addEventListener("click", (event) => {
    if (!getCurrentUser()) {
      event.preventDefault();
      showLogin();
    } else if (isMultiplayerGame(game)) {
      event.preventDefault();
      openLobbyForGame(game);
    }
  });

  return article;
}

function renderGames() {
  const visibleGames = getVisibleGames();
  gameGrid.innerHTML = "";

  if (visibleGames.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "no-results";
    emptyState.textContent = "Geen spellen gevonden. Probeer een andere zoekterm.";
    gameGrid.appendChild(emptyState);
  } else {
    visibleGames.forEach((game) => {
      gameGrid.appendChild(createGameCard(game));
    });
  }

  visibleCount.textContent = `${visibleGames.length} spellen zichtbaar`;
}

function renderUserList() {
  const users = loadUsers();
  userList.innerHTML = "";

  users.forEach((user) => {
    const item = document.createElement("li");
    item.className = "user-card";
    item.innerHTML = `
      <div class="user-card-main">
        <div class="user-card-top">
          <strong>${user.name || user.username}</strong>
          <span class="user-role">${user.role}</span>
        </div>
        <div class="user-status ${user.blocked ? "blocked" : "active"}">
          ${user.blocked ? `Geblokkeerd: ${user.blockReason || "Geen reden opgegeven"}` : "Actief"}
        </div>
      </div>

      <div class="user-card-editor">
        <label>
          <span>Gebruikersnaam</span>
          <input type="text" value="${user.username}" data-user-username="${user.username}" />
        </label>
        <label>
          <span>Wachtwoord</span>
          <input type="password" placeholder="Nieuw wachtwoord" data-user-password="${user.username}" />
        </label>
        <label>
          <span>Blokkeerreden</span>
          <input type="text" value="${user.blockReason || ""}" data-user-reason="${user.username}" placeholder="Reden voor blokkering" />
        </label>

        <div class="user-actions">
          <button type="button" class="inline-btn success" data-user-action="save" data-user="${user.username}">Opslaan</button>
          <button type="button" class="inline-btn ${user.blocked ? "success" : "warn"}" data-user-action="toggle-block" data-user="${user.username}">
            ${user.blocked ? "Deblokkeer" : "Blokkeer"}
          </button>
          <button type="button" class="inline-btn danger" data-user-action="delete" data-user="${user.username}">Verwijder</button>
        </div>
      </div>
    `;

    const saveButton = item.querySelector('[data-user-action="save"]');
    saveButton.addEventListener("click", () => {
      const users = loadUsers();
      const target = users.find((entry) => entry.username === user.username);
      if (!target) return;

      const nextUsername = item.querySelector(`[data-user-username="${user.username}"]`).value.trim();
      const nextPassword = item.querySelector(`[data-user-password="${user.username}"]`).value.trim();
      const nextReason = item.querySelector(`[data-user-reason="${user.username}"]`).value.trim();

      if (nextUsername && users.some((entry) => entry.username.toLowerCase() === nextUsername.toLowerCase() && entry.username !== user.username)) {
        alert("Deze gebruikersnaam bestaat al.");
        return;
      }

      if (nextUsername) target.username = nextUsername;
      if (nextPassword) target.password = nextPassword;
      target.name = target.username;
      if (nextReason || target.blocked) target.blockReason = nextReason || target.blockReason || "";

      saveUsers(users);

      const current = getCurrentUser();
      if (current && current.username === user.username) {
        setCurrentUser(target.username);
      }

      renderUserList();
      if (getCurrentUser()) showApp();
    });

    const toggleButton = item.querySelector('[data-user-action="toggle-block"]');
    toggleButton.addEventListener("click", () => {
      const users = loadUsers();
      const target = users.find((entry) => entry.username === user.username);
      if (!target) return;

      const reasonValue = item.querySelector(`[data-user-reason="${user.username}"]`).value.trim();
      if (!target.blocked && !reasonValue) {
        alert("Geef een reden op voordat je het account blokkeert.");
        return;
      }

      target.blocked = !target.blocked;
      target.blockReason = target.blocked ? reasonValue || "Geen reden opgegeven" : "";
      saveUsers(users);
      renderUserList();
    });

    const deleteButton = item.querySelector('[data-user-action="delete"]');
    deleteButton.addEventListener("click", () => {
      const users = loadUsers();
      if (users.length <= 1) {
        alert("Je kunt het laatste account niet verwijderen.");
        return;
      }

      const filtered = users.filter((entry) => entry.username !== user.username);
      saveUsers(filtered);

      const current = getCurrentUser();
      if (current && current.username === user.username) {
        clearCurrentUser();
        showLogin();
      }

      renderUserList();
      renderGames();
    });

    userList.appendChild(item);
  });
}

function renderGameList() {
  if (!gameList) return;

  const games = syncBrokenGames();
  gameList.innerHTML = "";

  games.forEach((game) => {
    const item = document.createElement("li");
    item.className = "user-card";
    item.innerHTML = `
      <div class="user-card-main">
        <div class="user-card-top">
          <strong>${game.name}</strong>
          <span class="user-role">${game.category}</span>
        </div>
        <div class="user-status ${game.blocked ? "blocked" : "active"}">
          ${game.blocked ? `Geblokkeerd: ${game.blockReason || "Geen reden opgegeven"}` : "Actief"}
        </div>
      </div>

      <div class="user-card-editor">
        <label>
          <span>Naam</span>
          <input type="text" value="${game.name}" data-game-name="${game.url}" />
        </label>
        <label>
          <span>URL</span>
          <input type="text" value="${game.url}" data-game-url="${game.url}" />
        </label>
        <label>
          <span>Reden voor blokkering</span>
          <input type="text" value="${game.blockReason || ""}" data-game-reason="${game.url}" placeholder="Bijv. tijdelijk uitgeschakeld" />
        </label>

        <div class="user-actions">
          <button type="button" class="inline-btn success" data-game-action="save" data-game-url="${game.url}">Opslaan</button>
          <button type="button" class="inline-btn ${game.blocked ? "success" : "warn"}" data-game-action="toggle-block" data-game-url="${game.url}">
            ${game.blocked ? "Deblokkeer" : "Blokkeer"}
          </button>
          <button type="button" class="inline-btn danger" data-game-action="delete" data-game-url="${game.url}">Verwijder</button>
        </div>
      </div>
    `;

    const saveButton = item.querySelector('[data-game-action="save"]');
    saveButton.addEventListener("click", () => {
      const games = syncBrokenGames();
      const target = games.find((entry) => entry.url === game.url);
      if (!target) return;

      const nextName = item.querySelector(`[data-game-name="${game.url}"]`).value.trim();
      const nextUrl = item.querySelector(`[data-game-url="${game.url}"]`).value.trim();
      const nextReason = item.querySelector(`[data-game-reason="${game.url}"]`).value.trim();

      const duplicate = games.some((entry) => entry.url !== game.url && entry.url.toLowerCase() === nextUrl.toLowerCase());
      if (nextUrl && duplicate) {
        alert("Deze spel-URL bestaat al.");
        return;
      }

      target.name = nextName || target.name;
      if (nextUrl) target.url = nextUrl;
      target.blockReason = nextReason || target.blockReason || "";
      saveGames(games);
      renderGameList();
      renderGames();
    });

    const toggleButton = item.querySelector('[data-game-action="toggle-block"]');
    toggleButton.addEventListener("click", () => {
      const games = syncBrokenGames();
      const target = games.find((entry) => entry.url === game.url);
      if (!target) return;

      const reasonValue = item.querySelector(`[data-game-reason="${game.url}"]`).value.trim();
      if (!target.blocked && !reasonValue) {
        alert("Geef een reden op voordat je het spel blokkeert.");
        return;
      }

      target.blocked = !target.blocked;
      target.blockReason = target.blocked ? reasonValue || "Geen reden opgegeven" : "";
      saveGames(games);
      renderGameList();
      renderGames();
    });

    const deleteButton = item.querySelector('[data-game-action="delete"]');
    deleteButton.addEventListener("click", () => {
      const games = syncBrokenGames();
      const filtered = games.filter((entry) => entry.url !== game.url);
      saveGames(filtered);
      renderGameList();
      renderGames();
    });

    gameList.appendChild(item);
  });
}

function openAddGameModal() {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    alert("Alleen admins kunnen spellen toevoegen.");
    return;
  }
  addGameModal.classList.remove("hidden");
}

function closeAddGameModal() {
  addGameModal.classList.add("hidden");
  addGameForm.reset();
}

function openAdminModal() {
  const user = getCurrentUser();
  if (!user || user.role !== "admin") return;

  const settings = loadSettings();
  siteTitleInput.value = settings.title;
  themeAccentSelect.value = settings.accent;
  renderUserList();
  renderGameList();
  adminModal.classList.remove("hidden");
}

function closeAdminModal() {
  adminModal.classList.add("hidden");
}

function handleAddGame(event) {
  event.preventDefault();

  const user = getCurrentUser();
  if (!user || user.role !== "admin") {
    alert("Alleen admins kunnen spellen toevoegen.");
    return;
  }

  const name = document.getElementById("newGameName").value.trim();
  const description = document.getElementById("newGameDescription").value.trim();
  const image = document.getElementById("newGameImage").value.trim();
  const url = document.getElementById("newGameUrl").value.trim();

  if (!name || !description || !image || !url) return;

  const normalizedUrl = url.startsWith("/") ? url.slice(1) : url;
  const games = syncBrokenGames();
  if (games.some((game) => (game.url || "").toLowerCase() === normalizedUrl.toLowerCase())) {
    alert("Dit spel bestaat al in de catalogus.");
    return;
  }

  const newGame = {
    name,
    description,
    image,
    category: "Overig",
    url: normalizedUrl,
    blocked: false,
    blockReason: ""
  };

  games.push(newGame);
  saveGames(games);
  closeAddGameModal();
  renderGameList();
  renderGames();
}

function handleAddUser(event) {
  event.preventDefault();

  const username = document.getElementById("newUsername").value.trim();
  const password = document.getElementById("newPassword").value.trim();
  const role = document.getElementById("newUserRole").value;

  if (!username || !password) return;

  const users = loadUsers();
  const exists = users.some((user) => user.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    alert("Deze gebruikersnaam bestaat al.");
    return;
  }

  users.push({
    username,
    password,
    role,
    name: username,
    blocked: false,
    blockReason: ""
  });

  saveUsers(users);
  addUserForm.reset();
  renderUserList();
}

function handleSettingsSave(event) {
  event.preventDefault();

  const settings = loadSettings();
  settings.title = siteTitleInput.value.trim() || "Game Hub";
  settings.accent = themeAccentSelect.value;
  saveSettings(settings);
  applySettingsToApp();
}

function handleAccountUpdate(event) {
  event.preventDefault();

  const currentUser = getCurrentUser();
  if (!currentUser) return;

  const desiredUsername = accountUsername.value.trim();
  const newPassword = accountPassword.value.trim();
  const enteredCurrentPassword = currentPasswordInput.value.trim();

  if (enteredCurrentPassword !== currentUser.password) {
    accountMessage.textContent = "Huidig wachtwoord is onjuist.";
    accountMessage.classList.add("error");
    return;
  }

  const users = loadUsers();
  const duplicate = users.some(
    (user) =>
      user.username.toLowerCase() === desiredUsername.toLowerCase() &&
      user.username !== currentUser.username
  );

  if (desiredUsername && duplicate) {
    accountMessage.textContent = "Deze gebruikersnaam is al in gebruik.";
    accountMessage.classList.add("error");
    return;
  }

  const targetUser = users.find((user) => user.username === currentUser.username);
  if (!targetUser) return;

  targetUser.username = desiredUsername || currentUser.username;
  targetUser.name = targetUser.username;
  if (newPassword) targetUser.password = newPassword;

  saveUsers(users);
  setCurrentUser(targetUser.username);

  accountMessage.textContent = "Je account is bijgewerkt.";
  accountMessage.classList.remove("error");
  accountForm.reset();
  showApp();
  accountModal.classList.add("hidden");
}

function bindLobbySocket() {
  if (!lobbySocket) return;

  lobbySocket.on("lobby:joined", (payload) => {
    const game = selectedLobbyGame.game;
    if (!game) return;

    const roomCode = payload.roomId || payload.joinCode || lobbyRoomCode.value.trim();
    lobbyRoomCodeDisplay.textContent = roomCode;
    lobbyRoomCode.value = roomCode;
    lobbyHostName.textContent = payload.hostName || payload.players?.[0]?.name || "-";
    renderLobbyPlayers(payload);
    waitingRoomPanel.classList.remove("hidden");
    playerModePanel.classList.add("hidden");
    computerModePanel.classList.add("hidden");
  });

  lobbySocket.on("lobby:update", (payload) => {
    const game = selectedLobbyGame.game;
    if (!game) return;

    const gameKey = getGameKeyFromUrl(game.url);
    if ((payload.game || "").toLowerCase() !== gameKey) return;

    lobbyHostName.textContent = payload.hostName || "-";
    lobbyRoomCodeDisplay.textContent = payload.roomId || "-";
    lobbyRoomCode.value = payload.roomId || "";
    renderLobbyPlayers(payload);
    waitingRoomPanel.classList.remove("hidden");
    playerModePanel.classList.add("hidden");
    computerModePanel.classList.add("hidden");
  });

  lobbySocket.on("lobby:error", ({ message }) => {
    alert(message || "Er ging iets mis met de lobby.");
  });

  lobbySocket.on("lobby:started", ({ game, roomId }) => {
    const gameObj = selectedLobbyGame.game;
    if (!gameObj) return;
    const roomCode = roomId;
    if (!roomCode) return;
    const gameKey = getGameKeyFromUrl(gameObj.url);
    if (game.toLowerCase() !== gameKey) return;
    window.location.href = `${gameObj.url}?room=${encodeURIComponent(roomCode)}&game=${encodeURIComponent(game)}`;
  });

  lobbySocket.on("lobby:left", () => {
    waitingRoomPanel.classList.add("hidden");
    openLobbyForGame(selectedLobbyGame.game);
  });
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderGames();
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.view === state.view);
      });
      renderGames();
    });
  });

  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", logout);

  lobbyModeButtons.forEach((button) => {
    button.addEventListener("click", () => setLobbyMode(button.dataset.lobbyMode));
  });

  lobbySubmitBtn.addEventListener("click", () => {
    const mode = document.querySelector(".lobby-mode-btn.is-active")?.dataset.lobbyMode || "computer";
    continueFromGameMode();
  });

  createLobbyRoomBtn.addEventListener("click", () => {
    setLobbyRole("host");
  });

  joinLobbyRoomBtn.addEventListener("click", () => {
    setLobbyRole("join");
  });

  lobbyRoomSubmitBtn.addEventListener("click", () => {
    joinOrCreateLobbyRoom(selectedLobbyGame.role === "join" ? "join" : "create");
  });

  lobbyStartBtn.addEventListener("click", startGameFromLobby);
  lobbyLeaveBtn.addEventListener("click", () => {
    const roomCode = lobbyRoomCodeDisplay.textContent.trim();
    const game = selectedLobbyGame.game;
    if (!game || !roomCode || roomCode === "-") {
      closeLobbyForGame();
      return;
    }

    if (lobbySocket) {
      lobbySocket.emit("lobby:leave");
    }
    closeLobbyForGame();
  });

  document.getElementById("openAccountModal").addEventListener("click", () => {
    const current = getCurrentUser();
    if (!current) return;
    accountUsername.value = current.username;
    accountMessage.textContent = "";
    accountMessage.classList.remove("error");
    accountModal.classList.remove("hidden");
  });

  document.getElementById("closeAccountModal").addEventListener("click", () => {
    accountModal.classList.add("hidden");
    accountForm.reset();
  });

  document.getElementById("openAddGameModal").addEventListener("click", openAddGameModal);
  document.getElementById("closeAddGameModal").addEventListener("click", closeAddGameModal);
  document.getElementById("openAdminPanel").addEventListener("click", openAdminModal);
  document.getElementById("closeAdminPanel").addEventListener("click", closeAdminModal);
  addGameForm.addEventListener("submit", handleAddGame);
  addUserForm.addEventListener("submit", handleAddUser);
  settingsForm.addEventListener("submit", handleSettingsSave);
  accountForm.addEventListener("submit", handleAccountUpdate);
}

async function init() {
  await refreshGameCatalogFromServer();
  syncBrokenGames();
  applySettingsToApp();
  bindLobbySocket();
  bindEvents();

  if (!getCurrentUser()) {
    showLogin();
  } else {
    showApp();
  }

  renderGames();
}

init();
