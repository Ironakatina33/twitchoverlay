const { getServiceClient } = require("./_lib/supabase");
const { getPublicState } = require("./_lib/state-store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const supabase = getServiceClient();
    const state = await getPublicState(supabase);
    res.status(200).json(state);
  } catch (error) {
    res.status(500).json({
      error: "Impossible de lire l'état overlay",
      details: error.message,
    });
  }
};
