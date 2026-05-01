const overlayRoot = document.getElementById("overlayRoot");
const viewerCountEl = document.getElementById("viewerCount");
const followCountEl = document.getElementById("followCount");
const lastFollowEl = document.getElementById("lastFollow");
const followAlertEl = document.getElementById("followAlert");
const alertUsernameEl = document.getElementById("alertUsername");

let alertTimeout = null;
let alertDurationMs = 5000;
let alertsEnabled = true;
let currentEventCursor = null;

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
}

function setTheme(settings) {
  const root = document.documentElement;
  root.style.setProperty("--font-family", settings.theme.fontFamily);
  root.style.setProperty("--primary", settings.theme.primaryColor);
  root.style.setProperty("--accent", settings.theme.accentColor);
  root.style.setProperty("--text", settings.theme.textColor);
  root.style.setProperty("--bg", settings.theme.backgroundColor);

  overlayRoot.classList.remove(
    "anchor-top-left",
    "anchor-top-right",
    "anchor-bottom-left",
    "anchor-bottom-right"
  );
  overlayRoot.classList.add(`anchor-${settings.layout.anchor}`);
  overlayRoot.style.gap = `${settings.layout.gap}px`;
  overlayRoot.style.transform = `scale(${settings.layout.scale})`;

  document.querySelector('[data-widget="viewers"]').style.display = settings.widgets.viewers
    ? "block"
    : "none";
  document.querySelector('[data-widget="followers"]').style.display = settings.widgets.followers
    ? "block"
    : "none";
  document.querySelector('[data-widget="lastFollow"]').style.display = settings.widgets.lastFollow
    ? "block"
    : "none";

  alertDurationMs = Number(settings.alerts.durationMs || 5000);
  alertsEnabled = Boolean(settings.alerts.enabled);
  if (!alertsEnabled) {
    followAlertEl.classList.add("hidden");
  }
}

function setStats(stats) {
  viewerCountEl.textContent = Number(stats.viewerCount || 0).toLocaleString("fr-FR");
  followCountEl.textContent = Number(stats.followCount || 0).toLocaleString("fr-FR");
  lastFollowEl.textContent = stats.lastFollow || "-";
}

function showFollowAlert(username) {
  if (!alertsEnabled) return;

  alertUsernameEl.textContent = username || "Nouveau follower";
  followAlertEl.classList.remove("hidden");

  clearTimeout(alertTimeout);
  alertTimeout = setTimeout(() => {
    followAlertEl.classList.add("hidden");
  }, alertDurationMs);
}

function applyState(payload) {
  if (!payload) return;
  setTheme(payload.settings);
  setStats(payload.stats);
}

async function loadInitialState() {
  const state = await fetchJson("/api/state");
  applyState(state);
}

async function bootSupabaseRealtime() {
  const config = await fetchJson("/api/public-config");
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return;
  }

  const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  supabase
    .channel("overlay-state-stream")
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
          // ignore transient errors, next realtime tick will retry
        }
      }
    )
    .subscribe();

  supabase
    .channel("overlay-event-stream")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "overlay_events",
      },
      (payload) => {
        const event = payload?.new;
        if (!event || event.type !== "follow") return;

        if (currentEventCursor !== null && event.id <= currentEventCursor) {
          return;
        }
        currentEventCursor = event.id;
        showFollowAlert(event.username);
      }
    )
    .subscribe();
}

async function boot() {
  try {
    await loadInitialState();
    await bootSupabaseRealtime();
  } catch {
    setTimeout(boot, 2000);
  }
}

boot();
