const { isAuthorizedPanelRequest } = require("../_lib/auth");
const { parseJsonBody } = require("../_lib/http");
const { getServiceClient } = require("../_lib/supabase");
const { sendJson } = require("../_lib/response");
const { triggerFollow } = require("../_lib/state-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  if (!isAuthorizedPanelRequest(req)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    const body = await parseJsonBody(req);
    const supabase = getServiceClient();
    const state = await triggerFollow(supabase, body?.username);
    return sendJson(res, 202, { ok: true, state });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Impossible de déclencher l'alerte follow",
      details: error.message,
    });
  }
};
