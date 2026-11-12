const express = require("express");
const dns = require("dns").promises;
const net = require("net");

const router = express.Router();

const MAX_SIZE = 5 * 1024 * 1024; // aligné sur la limite multer (5 Mo)
const TIMEOUT_MS = 10000;

// Refuse les adresses locales / privées (évite d'utiliser le proxy pour sonder le réseau interne)
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

// GET /api/image-proxy?url=https://...
// Télécharge une image distante pour contourner le CORS lors d'un glisser-déposer depuis un autre site.
router.get("/", async (req, res) => {
  const { url } = req.query;
  let target;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).json({ error: "URL invalide" });
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return res.status(400).json({ error: "Seules les URL http(s) sont acceptées" });
  }

  try {
    const { address } = await dns.lookup(target.hostname);
    if (isPrivateIp(address)) {
      return res.status(400).json({ error: "Adresse non autorisée" });
    }

    const response = await fetch(target, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (image-proxy)", Accept: "image/*" },
    });
    if (!response.ok) {
      return res.status(502).json({ error: `Le serveur distant a répondu ${response.status}` });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return res.status(415).json({ error: "La ressource n'est pas une image" });
    }
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_SIZE) {
      return res.status(413).json({ error: "Image trop volumineuse (5 Mo max)" });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_SIZE) {
      return res.status(413).json({ error: "Image trop volumineuse (5 Mo max)" });
    }

    res.set("Content-Type", contentType);
    res.send(buffer);
  } catch (err) {
    console.error("image-proxy:", err.message);
    res.status(502).json({ error: "Impossible de récupérer l'image" });
  }
});

module.exports = router;
