const { getServiceClient } = require("./_lib/supabase");
const { getPublicState } = require("./_lib/state-store");
const { sendJson } = require("./_lib/response");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const supabase = getServiceClient();
    const state = await getPublicState(supabase);
    return sendJson(res, 200, state);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Impossible de lire l'état overlay",
      details: error.message,
    });
  }
};
