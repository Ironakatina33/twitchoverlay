const { sendJson } = require("./_lib/response");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  return sendJson(res, 200, {
    supabaseUrl: process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
    panelTokenRequired: Boolean(process.env.PANEL_WRITE_TOKEN),
    twitchPollingEnabled: process.env.ENABLE_TWITCH_POLLING === "true",
  });
};
