// Netlify Function: inloggen, uitloggen en sessiestatus.
//   GET  /.netlify/functions/auth         -> { loggedIn, user }
//   POST /.netlify/functions/auth         -> body { user, password } -> zet sessiecookie
//   POST /.netlify/functions/auth?logout  -> wist sessiecookie

const session = require("../lib/session");

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };

function json(statusCode, body, extraHeaders) {
  return { statusCode, headers: { ...headers, ...extraHeaders }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (!session.isConfigured()) {
    return json(500, {
      error: "Inloggen is nog niet ingesteld. Stel RITTEN_USERS en SESSION_SECRET in als environment variables (zie README)."
    });
  }

  if (event.httpMethod === "GET") {
    const user = session.currentUser(event);
    return json(200, { loggedIn: Boolean(user), user });
  }

  if (event.httpMethod === "POST") {
    if (event.queryStringParameters && "logout" in event.queryStringParameters) {
      return json(200, { ok: true }, { "Set-Cookie": session.clearedCookie() });
    }

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (e) {
      return json(400, { error: "Ongeldige JSON." });
    }
    const user = session.checkCredentials(payload.user, payload.password);
    if (!user) {
      // Kleine vertraging maakt wachtwoorden raden via de API trager.
      await new Promise((r) => setTimeout(r, 600));
      return json(401, { error: "Onjuiste gebruikersnaam of wachtwoord." });
    }
    return json(200, { ok: true, user }, { "Set-Cookie": session.sessionCookie(user) });
  }

  return json(405, { error: "Methode niet toegestaan." });
};
