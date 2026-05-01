function isAuthorizedPanelRequest(req) {
  const expected = process.env.PANEL_WRITE_TOKEN;
  if (!expected) return true;

  const fromHeader = req.headers["x-panel-token"];
  const bearer = req.headers.authorization || "";
  const fromBearer = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";

  return fromHeader === expected || fromBearer === expected;
}

function isAuthorizedCronRequest(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;

  const bearer = req.headers.authorization || "";
  return bearer === `Bearer ${expected}`;
}

module.exports = {
  isAuthorizedPanelRequest,
  isAuthorizedCronRequest,
};
