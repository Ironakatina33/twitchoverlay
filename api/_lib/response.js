function sendJson(res, status, payload) {
  if (res && typeof res.status === "function" && typeof res.json === "function") {
    res.status(status).json(payload);
    return;
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

module.exports = {
  sendJson,
};
