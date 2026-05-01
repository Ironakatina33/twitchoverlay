const { isAuthorizedPanelRequest } = require("../_lib/auth");
const { getServiceClient } = require("../_lib/supabase");
const { resetStats } = require("../_lib/state-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (!isAuthorizedPanelRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const supabase = getServiceClient();
    const state = await resetStats(supabase);
    res.status(200).json({ ok: true, state });
  } catch (error) {
    res.status(500).json({
      error: "Impossible de reset les stats",
      details: error.message,
    });
  }
};
