throw new Error("Ce projet utilise maintenant Vercel serverless. Utilise `npm run dev` ou déploie sur Vercel.");
const path = require("path");
const fs = require("fs");
const { promises: fsp } = require("fs");
const http = require("http");

const dotenv = require("dotenv");
const express = require("express");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const RUNTIME_FILE = path.join(DATA_DIR, "runtime.json");

const defaultState = {
  settings: {
    overlayName: "Mon Stream",
    theme: {
      fontFamily: "'Space Grotesk', sans-serif",
      primaryColor: "#64f2c8",
      accentColor: "#ff7b72",
      textColor: "#f8fbff",
      backgroundColor: "rgba(12, 15, 24, 0.35)",
    },
    layout: {
      anchor: "top-left",
      gap: 16,
      scale: 1,
    },
    widgets: {
      viewers: true,
      followers: true,
      lastFollow: true,
    },
    alerts: {
      enabled: true,
      durationMs: 5000,
    },
  },
  stats: {
    viewerCount: 0,
    followCount: 0,
    lastFollow: "-",
    lastFollowAt: null,
  },
};

const state = structuredClone(defaultState);

const twitchState = {
  enabled: process.env.ENABLE_TWITCH_POLLING === "true",
  connected: false,
  lastError: "",
  lastSyncAt: null,
  appToken: "",
  appTokenExpiresAt: 0,
  broadcasterId: process.env.TWITCH_BROADCASTER_ID || "",
};

let saveSettingsTimeout = null;
let saveRuntimeTimeout = null;

function mergeDeep(target, source) {
  if (!source || typeof source !== "object") return target;
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      mergeDeep(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

async function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    await fsp.mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJson(filePath) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeJson(filePath, data) {
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function scheduleSettingsSave() {
  clearTimeout(saveSettingsTimeout);
  saveSettingsTimeout = setTimeout(() => {
    writeJson(SETTINGS_FILE, state.settings).catch((error) => {
      console.error("Impossible de sauvegarder les settings:", error.message);
    });
  }, 250);
}

function scheduleRuntimeSave() {
  clearTimeout(saveRuntimeTimeout);
  saveRuntimeTimeout = setTimeout(() => {
    writeJson(RUNTIME_FILE, state.stats).catch((error) => {
      console.error("Impossible de sauvegarder les stats:", error.message);
    });
  }, 250);
}

function getPublicState() {
  return {
    settings: state.settings,
    stats: state.stats,
    twitch: {
      enabled: twitchState.enabled,
      connected: twitchState.connected,
      lastError: twitchState.lastError,
      lastSyncAt: twitchState.lastSyncAt,
      broadcasterId: twitchState.broadcasterId || null,
    },
  };
}

function emitState() {
  io.emit("overlay:state", getPublicState());
}

function sanitizeFollowName(name) {
  const fallback = "Nouveau follower";
  if (typeof name !== "string") return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 64);
}

function pushFollowEvent(username) {
  const safeName = sanitizeFollowName(username);
  state.stats.followCount += 1;
  state.stats.lastFollow = safeName;
  state.stats.lastFollowAt = Date.now();

  emitState();
  io.emit("overlay:alert", {
    type: "follow",
    username: safeName,
    triggeredAt: Date.now(),
  });

  scheduleRuntimeSave();
}

async function getTwitchAppToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET manquant.");
  }

  const now = Date.now();
  if (twitchState.appToken && now < twitchState.appTokenExpiresAt - 60_000) {
    return twitchState.appToken;
  }

  const tokenUrl = new URL("https://id.twitch.tv/oauth2/token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Token Twitch refusé (${response.status}).`);
  }

  const data = await response.json();
  twitchState.appToken = data.access_token;
  twitchState.appTokenExpiresAt = Date.now() + (data.expires_in || 0) * 1000;
  return twitchState.appToken;
}

async function resolveBroadcasterId(token) {
  if (twitchState.broadcasterId) return twitchState.broadcasterId;

  const login = process.env.TWITCH_BROADCASTER_LOGIN;
  const clientId = process.env.TWITCH_CLIENT_ID;

  if (!login) {
    throw new Error("TWITCH_BROADCASTER_LOGIN manquant.");
  }

  const url = new URL("https://api.twitch.tv/helix/users");
  url.searchParams.set("login", login);

  const response = await fetch(url, {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Impossible de résoudre broadcaster_id (${response.status}).`);
  }

  const data = await response.json();
  const user = data?.data?.[0];
  if (!user?.id) {
    throw new Error("Aucun utilisateur Twitch trouvé avec TWITCH_BROADCASTER_LOGIN.");
  }

  twitchState.broadcasterId = user.id;
  return twitchState.broadcasterId;
}

async function syncViewerCountFromTwitch() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const login = process.env.TWITCH_BROADCASTER_LOGIN;

  if (!clientId || !login) {
    throw new Error("TWITCH_CLIENT_ID ou TWITCH_BROADCASTER_LOGIN manquant.");
  }

  const token = await getTwitchAppToken();
  await resolveBroadcasterId(token);

  const url = new URL("https://api.twitch.tv/helix/streams");
  url.searchParams.set("user_login", login);

  const response = await fetch(url, {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Lecture viewers Twitch impossible (${response.status}).`);
  }

  const payload = await response.json();
  const stream = payload?.data?.[0];
  const nextViewerCount = stream?.viewer_count ?? 0;

  if (Number.isFinite(nextViewerCount) && nextViewerCount !== state.stats.viewerCount) {
    state.stats.viewerCount = nextViewerCount;
    scheduleRuntimeSave();
    emitState();
  }

  twitchState.connected = true;
  twitchState.lastError = "";
  twitchState.lastSyncAt = Date.now();
}

function startTwitchPolling() {
  if (!twitchState.enabled) return;

  const pollMs = Math.max(5_000, Number(process.env.TWITCH_POLL_INTERVAL_MS || 15_000));

  const tick = async () => {
    try {
      await syncViewerCountFromTwitch();
    } catch (error) {
      twitchState.connected = false;
      twitchState.lastError = error.message || "Erreur inconnue Twitch";
      emitState();
    }
  };

  tick();
  setInterval(tick, pollMs);
}

async function bootstrap() {
  await ensureDataDir();

  const persistedSettings = await readJson(SETTINGS_FILE);
  const persistedRuntime = await readJson(RUNTIME_FILE);

  if (persistedSettings) {
    mergeDeep(state.settings, persistedSettings);
  }

  if (persistedRuntime) {
    mergeDeep(state.stats, persistedRuntime);
  }

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/overlay", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "overlay.html"));
  });

  app.get("/panel", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "panel.html"));
  });

  app.get("/api/state", (_req, res) => {
    res.json(getPublicState());
  });

  app.post("/api/events/follow", (req, res) => {
    const username = req.body?.username;
    pushFollowEvent(username);
    res.status(202).json({ ok: true });
  });

  io.on("connection", (socket) => {
    socket.emit("overlay:state", getPublicState());

    socket.on("panel:updateSettings", (nextSettings) => {
      if (!nextSettings || typeof nextSettings !== "object") return;
      mergeDeep(state.settings, nextSettings);
      scheduleSettingsSave();
      emitState();
    });

    socket.on("panel:triggerFollow", (payload) => {
      pushFollowEvent(payload?.username);
    });

    socket.on("panel:resetStats", () => {
      state.stats.viewerCount = 0;
      state.stats.followCount = 0;
      state.stats.lastFollow = "-";
      state.stats.lastFollowAt = null;
      scheduleRuntimeSave();
      emitState();
    });
  });

  server.listen(PORT, () => {
    console.log(`Overlay Studio en ligne: http://localhost:${PORT}`);
    console.log(`Overlay OBS: http://localhost:${PORT}/overlay`);
    console.log(`Panel custom: http://localhost:${PORT}/panel`);
  });

  startTwitchPolling();
}

bootstrap().catch((error) => {
  console.error("Erreur au démarrage:", error);
  process.exit(1);
});
