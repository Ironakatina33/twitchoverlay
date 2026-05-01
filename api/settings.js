const { isAuthorizedPanelRequest } = require("./_lib/auth");
const { getServiceClient } = require("./_lib/supabase");
const { parseJsonBody } = require("./_lib/http");
const { updateSettings } = require("./_lib/state-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (!isAuthorizedPanelRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = await parseJsonBody(req);
  const settings = body?.settings;
  if (!settings || typeof settings !== "object") {
    res.status(400).json({ error: "Payload invalide" });
    return;
  }

  try {
    const supabase = getServiceClient();
    const state = await updateSettings(supabase, settings);
    res.status(200).json(state);
  } catch (error) {
    res.status(500).json({
      error: "Impossible de sauvegarder les settings",
      details: error.message,
    });
  }
};
