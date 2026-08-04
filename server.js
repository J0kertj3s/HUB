const express = require("express");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// One central configuration for every game. `null` means no player limit.
const GAME_CONFIG = Object.freeze({
  arena: { maxPlayers: 2 },
  tictactoe: { maxPlayers: 2 },
  connect4: { maxPlayers: 2 },
  rps: { maxPlayers: 2 },
  simon: { maxPlayers: null },
  quizduel: { maxPlayers: 4 },
  memory: { maxPlayers: 4 },
  snake: { maxPlayers: 4 },
  tetris: { maxPlayers: 4 },
  trio: { maxPlayers: 4 }
});
const lobbies = new Map();

function gameId(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function lobbyCode(value) { return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12); }
function key(game, code) { return `${gameId(game)}:${lobbyCode(code)}`; }
function lobbyPayload(lobby) {
  return {
    game: lobby.game, roomId: lobby.roomId, hostId: lobby.hostId, hostName: lobby.players.get(lobby.hostId)?.name || "",
    maxPlayers: lobby.maxPlayers, status: lobby.status, state: lobby.state, playerStates: lobby.playerStates,
    players: [...lobby.players.values()].map((player) => ({ ...player, isHost: player.id === lobby.hostId }))
  };
}
function emitUpdate(lobby) { io.to(lobby.key).emit("lobby:update", lobbyPayload(lobby)); }
function error(socket, message) { socket.emit("lobby:error", { message }); }
function removePlayer(socket, lobby) {
  lobby.players.delete(socket.id);
  socket.leave(lobby.key);
  if (!lobby.players.size) { lobbies.delete(lobby.key); return; }
  if (lobby.hostId === socket.id) lobby.hostId = lobby.players.keys().next().value; // host transfers consistently
  emitUpdate(lobby);
}

function leaveCurrentLobby(socket) {
  const lobby = lobbies.get(socket.data.lobbyKey);
  if (lobby) removePlayer(socket, lobby);
  delete socket.data.lobbyKey;
}

app.use(express.static(__dirname));
app.get("/api/games", (req, res) => {
  const files = fs.readdirSync(__dirname).filter((file) => file.endsWith(".html") && file !== "index.html").sort();
  res.json(files.map((file) => ({ name: file.replace(/\.html$/i, "").replace(/[-_]/g, " "), url: file, image: `images/${file.replace(/\.html$/i, "")} .svg`.trim() })));
});
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

io.on("connection", (socket) => {
  socket.on("lobby:create", ({ game, username, roomId }) => {
    const normalizedGame = gameId(game);
    const config = GAME_CONFIG[normalizedGame];
    if (!config) return error(socket, "Dit spel heeft geen multiplayer-lobby.");

    // If the host provided a code, validate and use it; otherwise generate a unique code.
    let code = lobbyCode(roomId || "");
    if (code) {
      if (lobbies.has(key(normalizedGame, code))) return error(socket, "Deze lobbycode is al in gebruik.");
    } else {
      do { code = `${normalizedGame.slice(0, 3).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`; } while (lobbies.has(key(normalizedGame, code)));
    }

    leaveCurrentLobby(socket);

    const lobby = {
      key: key(normalizedGame, code),
      game: normalizedGame,
      roomId: code,
      maxPlayers: config.maxPlayers,
      status: "waiting",
      hostId: socket.id,
      players: new Map(),
      state: {},
      playerStates: {}
    };

    lobby.players.set(socket.id, { id: socket.id, name: String(username || "Speler").trim().slice(0, 30) || "Speler", connected: true });
    lobbies.set(lobby.key, lobby);
    socket.join(lobby.key);
    socket.data.lobbyKey = lobby.key;

    socket.emit("lobby:joined", lobbyPayload(lobby));
    emitUpdate(lobby);
  });

  socket.on("lobby:join", ({ game, roomId, username }) => {
    const lobby = lobbies.get(key(game, roomId));
    if (!lobby) return error(socket, "Deze lobbycode bestaat niet.");
    if (lobby.status !== "waiting") return error(socket, "Deze lobby is niet meer beschikbaar.");
    if (lobby.players.has(socket.id)) return socket.emit("lobby:joined", lobbyPayload(lobby));
    if (lobby.maxPlayers !== null && lobby.players.size >= lobby.maxPlayers) return error(socket, "Deze lobby zit vol.");

    // Prevent duplicate display names within the same lobby
    const name = String(username || "Speler").trim().slice(0, 30) || "Speler";
    const duplicateName = [...lobby.players.values()].some((p) => p.name === name);
    if (duplicateName) return error(socket, "Er is al een speler met die naam in deze lobby.");

    leaveCurrentLobby(socket);
    lobby.players.set(socket.id, { id: socket.id, name, connected: true });
    socket.join(lobby.key);
    socket.data.lobbyKey = lobby.key;
    socket.emit("lobby:joined", lobbyPayload(lobby));
    emitUpdate(lobby);
  });

  socket.on("lobby:leave", () => { leaveCurrentLobby(socket); socket.emit("lobby:left"); });

  socket.on("lobby:start", () => {
    const lobby = lobbies.get(socket.data.lobbyKey);
    if (!lobby) return error(socket, "Lobby niet gevonden.");
    if (lobby.hostId !== socket.id) return error(socket, "Alleen de host mag het spel starten.");
    if (lobby.players.size < 2) return error(socket, "Wacht op minimaal één andere speler.");
    lobby.status = "started";
    io.to(lobby.key).emit("lobby:started", lobbyPayload(lobby));
  });

  // A started lobby is closed to newcomers but its players may refresh and resume safely.
  socket.on("game:resume", ({ game, roomId, username }) => {
    const lobby = lobbies.get(key(game, roomId));
    if (!lobby || lobby.status !== "started") return error(socket, "Dit spel is niet beschikbaar.");

    const existing = [...lobby.players.values()].find((player) => player.name === String(username || "").trim());
    if (!existing) return error(socket, "Je bent geen speler in deze lobby.");

    // Replace the old socket id with the new one so players can resume after navigation/refresh
    lobby.players.delete(existing.id);
    lobby.players.set(socket.id, { ...existing, id: socket.id, connected: true });

    if (lobby.playerStates[existing.id]) {
      lobby.playerStates[socket.id] = lobby.playerStates[existing.id];
      delete lobby.playerStates[existing.id];
    }

    if (lobby.hostId === existing.id) lobby.hostId = socket.id;

    socket.join(lobby.key);
    socket.data.lobbyKey = lobby.key;
    socket.emit("room:update", lobbyPayload(lobby));
    emitUpdate(lobby);
  });

  socket.on("game:state", ({ state }) => {
    const lobby = lobbies.get(socket.data.lobbyKey);
    if (!lobby || lobby.status !== "started" || !lobby.players.has(socket.id)) return;
    lobby.state = state && typeof state === "object" ? state : {};
    io.to(lobby.key).emit("room:update", lobbyPayload(lobby));
  });

  socket.on("game:playerState", ({ state }) => {
    const lobby = lobbies.get(socket.data.lobbyKey);
    if (!lobby || lobby.status !== "started" || !lobby.players.has(socket.id) || !state || typeof state !== "object") return;
    lobby.playerStates[socket.id] = state;
    io.to(lobby.key).emit("room:update", lobbyPayload(lobby));
  });

  socket.on("disconnect", () => {
    const lobby = lobbies.get(socket.data.lobbyKey);
    if (!lobby) return;
    // A game page opens a new socket after navigation. Keep seats in started games so
    // players can resume after navigation, a refresh or a short connection loss.
    if (lobby.status === "started" && lobby.players.has(socket.id)) {
      lobby.players.set(socket.id, { ...lobby.players.get(socket.id), connected: false });
      emitUpdate(lobby);
      return;
    }
    removePlayer(socket, lobby);
  });
});

server.listen(process.env.PORT || 3000, () => console.log("Server draait op http://localhost:3000"));
