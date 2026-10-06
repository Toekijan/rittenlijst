// Gebruikersbeheer en sessies voor de Netlify Functions.
//
// Accounts staan in de omgevingsvariabele RITTEN_USERS, als komma-gescheiden lijst
// van naam:wachtwoord, bijvoorbeeld:
//   RITTEN_USERS = benito:geheim1,piet:geheim2
// Namen zijn hoofdletterongevoelig; wachtwoorden mogen geen komma bevatten.
// De eerste naam in de lijst is de eigenaar: die krijgt bij de eerste keer inloggen
// de ritten uit de oude (gedeelde) opslag van vóór de invoering van accounts.
//
// Een sessie is een HMAC-ondertekend, httpOnly cookie (ondertekend met SESSION_SECRET),
// zodat er geen sessieopslag nodig is — Netlify Functions zijn stateless.

const crypto = require("crypto");

const COOKIE_NAME = "rl_session";
const SESSION_DAYS = 30;

function getUsers() {
  const users = new Map();
  String(process.env.RITTEN_USERS || "")
    .split(",")
    .forEach((pair) => {
      const idx = pair.indexOf(":");
      if (idx < 1) return;
      const name = pair.slice(0, idx).trim().toLowerCase();
      const password = pair.slice(idx + 1).trim();
      if (/^[a-z0-9._-]+$/.test(name) && password) users.set(name, password);
    });
  return users;
}

function getOwner() {
  const first = getUsers().keys().next();
  return first.done ? null : first.value;
}

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET ontbreekt (zie README).");
  return secret;
}

function isConfigured() {
  return Boolean(process.env.SESSION_SECRET) && getUsers().size > 0;
}

function safeEqual(a, b) {
  const bufA = crypto.createHash("sha256").update(String(a)).digest();
  const bufB = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

// Geeft de genormaliseerde gebruikersnaam terug bij een juiste combinatie, anders null.
function checkCredentials(name, password) {
  const user = String(name || "").trim().toLowerCase();
  const expected = getUsers().get(user);
  // Altijd vergelijken, ook bij onbekende naam, zodat de responstijd niets verraadt.
  const ok = safeEqual(password || "", expected || crypto.randomBytes(16).toString("hex"));
  return ok && expected ? user : null;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  let expected;
  try {
    expected = crypto.createHmac("sha256", getSecret()).update(body).digest("base64url");
  } catch (_) {
    return null;
  }
  if (!safeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Date.now()) return null;
    // Een verwijderd account verliest direct toegang, ook met een nog geldig cookie.
    if (!getUsers().has(payload.u)) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function readToken(event) {
  const header = (event.headers && (event.headers.cookie || event.headers.Cookie)) || "";
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx > -1 && part.slice(0, idx).trim() === COOKIE_NAME) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

// Geeft de ingelogde gebruikersnaam terug, of null.
function currentUser(event) {
  const payload = verify(readToken(event));
  return payload ? payload.u : null;
}

function sessionCookie(user) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const token = sign({ u: user, exp: Date.now() + maxAge * 1000 });
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearedCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

module.exports = { isConfigured, checkCredentials, currentUser, getOwner, sessionCookie, clearedCookie };
