const refs = {
  panelToken: document.getElementById("panelToken"),
  overlayName: document.getElementById("overlayName"),
  fontFamily: document.getElementById("fontFamily"),
  primaryColor: document.getElementById("primaryColor"),
  accentColor: document.getElementById("accentColor"),
  textColor: document.getElementById("textColor"),
  anchor: document.getElementById("anchor"),
  gap: document.getElementById("gap"),
  scale: document.getElementById("scale"),
  showViewers: document.getElementById("showViewers"),
  showFollowers: document.getElementById("showFollowers"),
  showLastFollow: document.getElementById("showLastFollow"),
  alertsEnabled: document.getElementById("alertsEnabled"),
  alertDuration: document.getElementById("alertDuration"),
  testFollowName: document.getElementById("testFollowName"),
  triggerFollow: document.getElementById("triggerFollow"),
  resetStats: document.getElementById("resetStats"),
  twitchStatus: document.getElementById("twitchStatus"),
  twitchSyncAt: document.getElementById("twitchSyncAt"),
  overlayUrl: document.getElementById("overlayUrl"),
};

let syncingForm = false;
let panelTokenRequired = false;

function getPanelToken() {
  return refs.panelToken.value.trim();
}

function buildJsonHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = getPanelToken();
  if (token) {
    headers["x-panel-token"] = token;
  }

  return headers;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  let body = {};

  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const error = new Error(body?.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return body;
}

function getFormSettings() {
  return {
    overlayName: refs.overlayName.value,
    theme: {
      fontFamily: refs.fontFamily.value,
      primaryColor: refs.primaryColor.value,
      accentColor: refs.accentColor.value,
      textColor: refs.textColor.value,
    },
    layout: {
      anchor: refs.anchor.value,
      gap: Number(refs.gap.value || 16),
      scale: Number(refs.scale.value || 1),
    },
    widgets: {
      viewers: refs.showViewers.checked,
      followers: refs.showFollowers.checked,
      lastFollow: refs.showLastFollow.checked,
    },
    alerts: {
      enabled: refs.alertsEnabled.checked,
      durationMs: Number(refs.alertDuration.value || 5000),
    },
  };
}

function applySettingsToForm(settings) {
  syncingForm = true;

  refs.overlayName.value = settings.overlayName;
  refs.fontFamily.value = settings.theme.fontFamily;
  refs.primaryColor.value = settings.theme.primaryColor;
  refs.accentColor.value = settings.theme.accentColor;
  refs.textColor.value = settings.theme.textColor;

  refs.anchor.value = settings.layout.anchor;
  refs.gap.value = settings.layout.gap;
  refs.scale.value = settings.layout.scale;

  refs.showViewers.checked = settings.widgets.viewers;
  refs.showFollowers.checked = settings.widgets.followers;
  refs.showLastFollow.checked = settings.widgets.lastFollow;

  refs.alertsEnabled.checked = settings.alerts.enabled;
  refs.alertDuration.value = settings.alerts.durationMs;

  syncingForm = false;
}

function pushSettings() {
  if (syncingForm) return;

  fetchJson("/api/settings", {
    method: "POST",
    headers: buildJsonHeaders(),
    body: JSON.stringify({ settings: getFormSettings() }),
  })
    .then((state) => {
      applyState(state);
    })
    .catch((error) => {
      if (error.status === 401 && panelTokenRequired) {
        refs.twitchSyncAt.textContent = "Token panel invalide ou manquant.";
      }
    });
}

function bindEvents() {
  Object.values(refs).forEach((node) => {
    if (!node || !("addEventListener" in node)) return;
    if (
      node === refs.panelToken ||
      node === refs.triggerFollow ||
      node === refs.resetStats ||
      node === refs.twitchStatus ||
      node === refs.twitchSyncAt ||
      node === refs.overlayUrl
    ) {
      return;
    }
    node.addEventListener("input", pushSettings);
    node.addEventListener("change", pushSettings);
  });

  refs.triggerFollow.addEventListener("click", () => {
    fetchJson("/api/events/follow", {
      method: "POST",
      headers: buildJsonHeaders(),
      body: JSON.stringify({ username: refs.testFollowName.value }),
    })
      .then((result) => {
        if (result?.state) {
          applyState(result.state);
        }
      })
      .catch((error) => {
        if (error.status === 401 && panelTokenRequired) {
          refs.twitchSyncAt.textContent = "Token panel invalide ou manquant.";
        }
      });

    refs.testFollowName.value = "";
  });

  refs.resetStats.addEventListener("click", () => {
    fetchJson("/api/stats/reset", {
      method: "POST",
      headers: buildJsonHeaders(),
    })
      .then((result) => {
        if (result?.state) {
          applyState(result.state);
        }
      })
      .catch((error) => {
        if (error.status === 401 && panelTokenRequired) {
          refs.twitchSyncAt.textContent = "Token panel invalide ou manquant.";
        }
      });
  });
}

function renderTwitchStatus(twitch) {
  refs.twitchStatus.classList.remove("success", "warning");

  if (!twitch?.enabled) {
    refs.twitchStatus.textContent = "Twitch: mode manuel";
    refs.twitchStatus.classList.add("warning");
    refs.twitchSyncAt.textContent = "Sync: désactivée";
    return;
  }

  if (twitch.connected) {
    refs.twitchStatus.textContent = "Twitch: connecté";
    refs.twitchStatus.classList.add("success");
    refs.twitchSyncAt.textContent = twitch.lastSyncAt
      ? `Sync: ${new Date(twitch.lastSyncAt).toLocaleTimeString("fr-FR")}`
      : "Sync: en attente";
    return;
  }

  refs.twitchStatus.textContent = "Twitch: erreur";
  refs.twitchStatus.classList.add("warning");
  refs.twitchSyncAt.textContent = twitch.lastError ? `Erreur: ${twitch.lastError}` : "Sync: KO";
}

function applyState(payload) {
  if (!payload) return;
  applySettingsToForm(payload.settings);
  renderTwitchStatus(payload.twitch);
}

async function loadInitialState() {
  const state = await fetchJson("/api/state");
  applyState(state);
}

async function loadPublicConfig() {
  const config = await fetchJson("/api/public-config");
  panelTokenRequired = Boolean(config.panelTokenRequired);

  if (panelTokenRequired) {
    refs.panelToken.placeholder = "Token requis";
  }

  if (config.twitchPollingEnabled) {
    await fetchJson("/api/twitch-sync-viewers", {
      method: "POST",
      headers: buildJsonHeaders(),
    }).catch(() => {
      // ignore, cron will eventually sync viewers
    });
  }

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return;
  }

  const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  supabase
    .channel("panel-state-stream")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "overlay_state",
        filter: "id=eq.main",
      },
      async () => {
        try {
          const state = await fetchJson("/api/state");
          applyState(state);
        } catch {
          // ignore transient errors
        }
      }
    )
    .subscribe();
}

async function boot() {
  try {
    await loadInitialState();
    await loadPublicConfig();
  } catch {
    setTimeout(boot, 2000);
  }
}

refs.overlayUrl.textContent = `${window.location.origin}/overlay`;
bindEvents();
boot();
