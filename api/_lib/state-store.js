const { defaultState } = require("./default-state");

const STATE_ID = "main";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeDeep(target, source) {
  if (!source || typeof source !== "object") return target;

  Object.entries(source).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      mergeDeep(target[key], value);
      return;
    }
    target[key] = value;
  });

  return target;
}

function sanitizeFollowName(name) {
  const fallback = "Nouveau follower";
  if (typeof name !== "string") return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 64);
}

function rowToPublicState(row) {
  const mergedSettings = mergeDeep(clone(defaultState.settings), row.settings || {});

  return {
    settings: mergedSettings,
    stats: {
      viewerCount: Number(row.viewer_count || 0),
      followCount: Number(row.follow_count || 0),
      lastFollow: row.last_follow || "-",
      lastFollowAt: row.last_follow_at || null,
    },
    twitch: {
      enabled: process.env.ENABLE_TWITCH_POLLING === "true",
      connected: Boolean(row.twitch_connected),
      lastError: row.twitch_last_error || "",
      lastSyncAt: row.twitch_last_sync_at || null,
      broadcasterId: process.env.TWITCH_BROADCASTER_ID || null,
    },
  };
}

function getDefaultRow() {
  return {
    id: STATE_ID,
    settings: clone(defaultState.settings),
    viewer_count: defaultState.stats.viewerCount,
    follow_count: defaultState.stats.followCount,
    last_follow: defaultState.stats.lastFollow,
    last_follow_at: defaultState.stats.lastFollowAt,
    twitch_connected: false,
    twitch_last_error: "",
    twitch_last_sync_at: null,
    updated_at: new Date().toISOString(),
  };
}

async function readStateRow(supabase) {
  const { data, error } = await supabase
    .from("overlay_state")
    .select("*")
    .eq("id", STATE_ID)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureStateRow(supabase) {
  const existing = await readStateRow(supabase);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("overlay_state")
    .insert(getDefaultRow())
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function getPublicState(supabase) {
  const row = await ensureStateRow(supabase);
  return rowToPublicState(row);
}

async function updateSettings(supabase, partialSettings) {
  const row = await ensureStateRow(supabase);
  const mergedSettings = mergeDeep(clone(defaultState.settings), row.settings || {});
  mergeDeep(mergedSettings, partialSettings || {});

  const { data, error } = await supabase
    .from("overlay_state")
    .update({
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", STATE_ID)
    .select("*")
    .single();

  if (error) throw error;
  return rowToPublicState(data);
}

async function triggerFollow(supabase, username) {
  const row = await ensureStateRow(supabase);
  const safeName = sanitizeFollowName(username);

  const payload = {
    follow_count: Number(row.follow_count || 0) + 1,
    last_follow: safeName,
    last_follow_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("overlay_state")
    .update(payload)
    .eq("id", STATE_ID)
    .select("*")
    .single();

  if (error) throw error;

  const { error: eventError } = await supabase.from("overlay_events").insert({
    type: "follow",
    username: safeName,
    triggered_at: new Date().toISOString(),
  });

  if (eventError) throw eventError;

  return rowToPublicState(data);
}

async function resetStats(supabase) {
  await ensureStateRow(supabase);

  const { data, error } = await supabase
    .from("overlay_state")
    .update({
      viewer_count: 0,
      follow_count: 0,
      last_follow: "-",
      last_follow_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", STATE_ID)
    .select("*")
    .single();

  if (error) throw error;
  return rowToPublicState(data);
}

async function setViewerCountAndTwitchStatus(supabase, input) {
  await ensureStateRow(supabase);

  const patch = {
    viewer_count: Number(input.viewerCount || 0),
    twitch_connected: Boolean(input.connected),
    twitch_last_error: input.lastError || "",
    twitch_last_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("overlay_state")
    .update(patch)
    .eq("id", STATE_ID)
    .select("*")
    .single();

  if (error) throw error;
  return rowToPublicState(data);
}

module.exports = {
  getPublicState,
  updateSettings,
  triggerFollow,
  resetStats,
  setViewerCountAndTwitchStatus,
};
