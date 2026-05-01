const { isAuthorizedPanelRequest } = require("../_lib/auth");
const { parseJsonBody } = require("../_lib/http");
const { getServiceClient } = require("../_lib/supabase");
const { triggerFollow } = require("../_lib/state-store");

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
    const body = await parseJsonBody(req);
    const supabase = getServiceClient();
    const state = await triggerFollow(supabase, body?.username);
    res.status(202).json({ ok: true, state });
  } catch (error) {
    res.status(500).json({
      error: "Impossible de déclencher l'alerte follow",
      details: error.message,
    });
  }
};
