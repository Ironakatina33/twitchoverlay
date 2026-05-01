const { isAuthorizedCronRequest, isAuthorizedPanelRequest } = require("../_lib/auth");
const { getServiceClient } = require("../_lib/supabase");
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
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (req.method === "GET" && !isAuthorizedCronRequest(req)) {
    res.status(401).json({ error: "Unauthorized cron" });
    return;
  }

  if (req.method === "POST" && !isAuthorizedPanelRequest(req)) {
    res.status(401).json({ error: "Unauthorized panel" });
    return;
  }

  try {
    const state = await syncViewers();
    res.status(200).json({ ok: true, state });
  } catch (error) {
    res.status(500).json({
      error: "Sync viewers impossible",
      details: error.message,
    });
  }
};
