(function () {
  function currentUsername() {
    const active = localStorage.getItem("gameHubActiveUser");
    const users = JSON.parse(localStorage.getItem("gameHubUsers") || "[]");
    return users.find((user) => user.username === active)?.name || active || "Speler";
  }

  function addMultiplayerStatus() {
    const status = document.createElement("aside");
    status.className = "multiplayer-status";
    status.setAttribute("aria-live", "polite");
    status.innerHTML = '<strong>Multiplayer</strong><span>Verbinden met spel...</span>';
    document.body.prepend(status);
    return status;
  }

  function createMultiplayerController({ gameName, onRoomState, onConnect }) {
    const socket = window.io ? window.io() : null;
    const query = new URLSearchParams(location.search);
    const roomId = query.get("room");
    const game = query.get("game") || String(gameName || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const multiplayer = Boolean(socket && roomId);
    // Old standalone room controls are superseded by the shared lobby on the home page.
    document.querySelectorAll('.room-panel').forEach((panel) => { panel.hidden = true; });
    let room = null;
    const status = multiplayer ? addMultiplayerStatus() : null;
    let ready = !multiplayer; // only ready when we've received a room update in multiplayer

    function updateStatus(payload) {
      if (!status || !payload) return;
      const players = Array.isArray(payload.players) ? payload.players : [];
      const names = players.map((player) => {
        const score = payload.playerStates?.[player.id]?.score;
        return `${player.name}${player.isHost ? " (host)" : ""}${Number.isFinite(score) ? ` · ${score} p.` : ""}`;
      }).join(", ");
      status.innerHTML = `<strong>Multiplayer · ${players.length}${payload.maxPlayers === null ? "" : `/${payload.maxPlayers}`} spelers</strong><span>${names || "Wachten op spelers..."}</span>`;
    }

    if (!multiplayer) {
      return {
        isMultiplayer() { return false; },
        isHost() { return false; },
        getPlayerIndex() { return 0; },
        getPlayers() { return []; }, getPlayerStates() { return {}; },
        joinRoom() {}, sendState() {}, sendPlayerState() {}, getRoomId() { return null; }, destroy() {}
      };
    }

    const resume = () => socket.emit("game:resume", { game, roomId, username: currentUsername() });
    socket.on("connect", () => { onConnect?.(socket.id); resume(); });

    socket.on("lobby:joined", (payload) => {
      if (!payload || (payload.game || "").toLowerCase() !== game) return;
      room = payload;
      ready = true;
      updateStatus(payload);
      onRoomState?.(payload);
    });

    socket.on("room:update", (payload) => {
      if (payload?.game !== game) return;
      room = payload;
      ready = true;
      updateStatus(payload);
      onRoomState?.(payload);
    });

    socket.on("lobby:error", ({ message }) => {
      if (status) status.innerHTML = `<strong>Multiplayer</strong><span>${message || "Verbinding mislukt."}</span>`;
    });

    return {
      isMultiplayer() { return true; },
      isHost() { return room?.hostId === socket.id; },
      getPlayerIndex() { return Math.max(0, (room?.players || []).findIndex((player) => player.id === socket.id)); },
      getPlayers() { return room?.players || []; },
      getPlayerStates() { return room?.playerStates || {}; },
      joinRoom(code) {
        if (!socket) {
          // fallback: navigate to the game URL with query params
          const target = `${location.pathname}?room=${encodeURIComponent(code || "")}&game=${encodeURIComponent(game)}`;
          location.href = target;
          return;
        }
        socket.emit("lobby:join", { game, roomId: String(code || "").trim(), username: currentUsername() });
      },
      sendState(state) { if (!ready) return; socket.emit("game:state", { state }); },
      sendPlayerState(state) { if (!ready) return; socket.emit("game:playerState", { state }); },
      getRoomId() { return roomId; },
      destroy() { socket.disconnect(); }
    };
  }
  window.GameMultiplayer = { createMultiplayerController };
})();
