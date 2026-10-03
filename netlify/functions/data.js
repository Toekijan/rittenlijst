// Netlify Function: opslag en ophalen van reisregistratie-data via Netlify Blobs.
// Geen authenticatie: bedoeld voor persoonlijk, single-user gebruik.
// Iedereen die de site-URL kent kan de data lezen/wijzigen — deel de URL dus niet breder dan gewenst.
//
// Let op (drag-and-drop deploys): bij een handmatige zip-upload geeft Netlify de Function niet
// automatisch de site-context mee die Netlify Blobs nodig heeft. Daarom geven we siteID en token
// hieronder expliciet mee, uitgelezen uit environment variables die je zelf instelt in
// Site configuration -> Environment variables:
//   BLOBS_SITE_ID   = de Site ID van je Netlify-site (Site configuration -> General -> Site details)
//   BLOBS_TOKEN     = een Personal Access Token (User settings -> Applications -> New access token)

const { getStore } = require("@netlify/blobs");

const STORE_NAME = "reisregistratie";
const BLOB_KEY = "data";

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
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
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
      const data = await store.get(BLOB_KEY, { type: "json" });
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
      await store.setJSON(BLOB_KEY, record);
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
