let cachedToken = "";
let tokenExpiresAt = 0;

async function getAppToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET manquant.");
  }

  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const tokenUrl = new URL("https://id.twitch.tv/oauth2/token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Token Twitch refusé (${response.status}).`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Number(data.expires_in || 0) * 1000;

  return cachedToken;
}

async function fetchViewerCount() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const login = process.env.TWITCH_BROADCASTER_LOGIN;

  if (!clientId || !login) {
    throw new Error("TWITCH_CLIENT_ID ou TWITCH_BROADCASTER_LOGIN manquant.");
  }

  const token = await getAppToken();

  const url = new URL("https://api.twitch.tv/helix/streams");
  url.searchParams.set("user_login", login);

  const response = await fetch(url, {
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Lecture viewers Twitch impossible (${response.status}).`);
  }

  const payload = await response.json();
  const stream = payload?.data?.[0];
  const viewerCount = stream?.viewer_count ?? 0;

  return Number(viewerCount) || 0;
}

module.exports = {
  fetchViewerCount,
};
