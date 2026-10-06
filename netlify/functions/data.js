// Netlify Function: opslag en ophalen van reisregistratie-data via Netlify Blobs.
// Alleen toegankelijk voor ingelogde gebruikers (zie netlify/lib/session.js); iedere gebruiker
// heeft een eigen record onder de sleutel "users/<naam>".
//
// Let op (drag-and-drop deploys): bij een handmatige zip-upload geeft Netlify de Function niet
// automatisch de site-context mee die Netlify Blobs nodig heeft. Daarom geven we siteID en token
// hieronder expliciet mee, uitgelezen uit environment variables die je zelf instelt in
// Site configuration -> Environment variables:
//   BLOBS_SITE_ID   = de Site ID van je Netlify-site (Site configuration -> General -> Site details)
//   BLOBS_TOKEN     = een Personal Access Token (User settings -> Applications -> New access token)

const { getStore } = require("@netlify/blobs");
const session = require("../lib/session");

const STORE_NAME = "reisregistratie";
// Sleutel van de gedeelde opslag van vóór de invoering van accounts.
const LEGACY_BLOB_KEY = "data";

function userKey(user) {
  return `users/${user}`;
}

function getConfiguredStore() {
  const siteID = process.env.BLOBS_SITE_ID;
  const token = process.env.BLOBS_TOKEN;

  // Als Netlify de context wél automatisch meegeeft (bv. bij Git-deploys), werkt getStore(naam) ook zonder extra config.
  if (siteID && token) {
    return getStore({ name: STORE_NAME, siteID, token });
  }
  return getStore(STORE_NAME);
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  const user = session.currentUser(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Niet ingelogd." }) };
  }

  let store;
  try {
    store = getConfiguredStore();
  } catch (err) {
    console.error("Kon Blobs-store niet initialiseren:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Netlify Blobs is niet correct geconfigureerd. Stel BLOBS_SITE_ID en BLOBS_TOKEN in als environment variables (zie README)."
      })
    };
  }

  try {
    if (event.httpMethod === "GET") {
      let data = await store.get(userKey(user), { type: "json" });
      // Eenmalige migratie: de eigenaar neemt de ritten uit de oude gedeelde opslag over.
      if (!data && user === session.getOwner()) {
        const legacy = await store.get(LEGACY_BLOB_KEY, { type: "json" });
        if (legacy) {
          await store.setJSON(userKey(user), legacy);
          data = legacy;
        }
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data || { entries: {}, declaredMonths: {}, updatedAt: null })
      };
    }

    if (event.httpMethod === "PUT") {
      let payload;
      try {
        payload = JSON.parse(event.body || "{}");
      } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Ongeldige JSON." }) };
      }
      const record = {
        entries: payload.entries || {},
        declaredMonths: payload.declaredMonths || {},
        updatedAt: payload.updatedAt || Date.now()
      };
      await store.setJSON(userKey(user), record);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Methode niet toegestaan." }) };
  } catch (err) {
    console.error("Blob-opslag fout:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || "Interne serverfout." })
    };
  }
};
