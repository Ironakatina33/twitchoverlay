const { isAuthorizedPanelRequest } = require("../_lib/auth");
const { getServiceClient } = require("../_lib/supabase");
const { sendJson } = require("../_lib/response");
const { resetStats } = require("../_lib/state-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  if (!isAuthorizedPanelRequest(req)) {
    return sendJson(res, 401, { error: "Unauthorized" });
  }

  try {
    const supabase = getServiceClient();
    const state = await resetStats(supabase);
    return sendJson(res, 200, { ok: true, state });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Impossible de reset les stats",
      details: error.message,
    });
  }
};
