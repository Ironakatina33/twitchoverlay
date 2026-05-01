const { isAuthorizedCronRequest, isAuthorizedPanelRequest } = require("../_lib/auth");
const { getServiceClient } = require("../_lib/supabase");
const { sendJson } = require("../_lib/response");
const { setViewerCountAndTwitchStatus } = require("../_lib/state-store");
const { fetchViewerCount } = require("../_lib/twitch");

async function syncViewers() {
  const supabase = getServiceClient();

  if (process.env.ENABLE_TWITCH_POLLING !== "true") {
    return setViewerCountAndTwitchStatus(supabase, {
      viewerCount: 0,
      connected: false,
      lastError: "Sync Twitch désactivée",
    });
  }

  try {
    const viewerCount = await fetchViewerCount();
    return await setViewerCountAndTwitchStatus(supabase, {
      viewerCount,
      connected: true,
      lastError: "",
    });
  } catch (error) {
    return await setViewerCountAndTwitchStatus(supabase, {
      viewerCount: 0,
      connected: false,
      lastError: error.message || "Erreur Twitch",
    });
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  if (req.method === "GET" && !isAuthorizedCronRequest(req)) {
    return sendJson(res, 401, { error: "Unauthorized cron" });
  }

  if (req.method === "POST" && !isAuthorizedPanelRequest(req)) {
    return sendJson(res, 401, { error: "Unauthorized panel" });
  }

  try {
    const state = await syncViewers();
    return sendJson(res, 200, { ok: true, state });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Sync viewers impossible",
      details: error.message,
    });
  }
};
