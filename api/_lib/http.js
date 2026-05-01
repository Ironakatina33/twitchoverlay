async function parseJsonBody(req) {
  if (!req) {
    return {};
  }

  if (typeof req.json === "function") {
    try {
      const parsed = await req.json();
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  if (req.body == null) {
    return {};
  }

  if (typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString("utf8"));
    } catch {
      return {};
    }
  }

  return {};
}

module.exports = {
  parseJsonBody,
};
