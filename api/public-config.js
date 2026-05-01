const { getSupabaseAnonKey, getSupabaseUrl } = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  res.status(200).json({
    supabaseUrl: getSupabaseUrl() || null,
    supabaseAnonKey: getSupabaseAnonKey() || null,
    panelTokenRequired: Boolean(process.env.PANEL_WRITE_TOKEN),
    twitchPollingEnabled: process.env.ENABLE_TWITCH_POLLING === "true",
  });
};
