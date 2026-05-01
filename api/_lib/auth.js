function getHeader(req, headerName) {
  if (!req || !req.headers) return "";

  if (typeof req.headers.get === "function") {
    return req.headers.get(headerName) || "";
  }

  const direct =
    req.headers[headerName] ||
    req.headers[headerName.toLowerCase()] ||
    req.headers[headerName.toUpperCase()];

  if (Array.isArray(direct)) {
    return direct[0] || "";
  }

  return direct || "";
}

function isAuthorizedPanelRequest(req) {
  const expected = process.env.PANEL_WRITE_TOKEN;
  if (!expected) return true;

  const fromHeader = getHeader(req, "x-panel-token");
  const bearer = getHeader(req, "authorization");
  const fromBearer = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";

  return fromHeader === expected || fromBearer === expected;
}

function isAuthorizedCronRequest(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;

  const bearer = getHeader(req, "authorization");
  return bearer === `Bearer ${expected}`;
}

module.exports = {
  isAuthorizedPanelRequest,
  isAuthorizedCronRequest,
};
