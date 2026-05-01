const { isAuthorizedPanelRequest } = require("./_lib/auth");
const { getServiceClient } = require("./_lib/supabase");
const { parseJsonBody } = require("./_lib/http");
const { sendJson } = require("./_lib/response");
const { updateSettings } = require("./_lib/state-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  if (!isAuthorizedPanelRequest(req)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  const body = await parseJsonBody(req);
  const settings = body?.settings;
  if (!settings || typeof settings !== "object") {
    return sendJson(res, 400, { error: "Payload invalide" });
  }

  try {
    const supabase = getServiceClient();
    const state = await updateSettings(supabase, settings);
    return sendJson(res, 200, state);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Impossible de sauvegarder les settings",
      details: error.message,
    });
  }
};
