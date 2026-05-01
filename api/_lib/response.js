function sendJson(res, status, payload) {
  if (res && typeof res.status === "function" && typeof res.json === "function") {
    res.status(status).json(payload);
    return;
  }

  const body = JSON.stringify(payload);

  if (res && typeof res.setHeader === "function" && typeof res.end === "function") {
    res.statusCode = status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(body);
    return;
  }

  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

module.exports = {
  sendJson,
};
