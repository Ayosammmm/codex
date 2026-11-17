const path = require("path");
const express = require("express");
const { MODS_ROOT } = require("./modStore");

/**
 * Service des fichiers de mods : /mod-files/<id>/<fichier> et le SDK /mod-files/almanach-sdk.js.
 *
 * Sécurité : le code d'un mod est envoyé par un utilisateur. Chaque réponse porte un en-tête CSP
 * « sandbox » : même ouverte directement dans un onglet, la page a une origine opaque (pas d'accès
 * au jeton de session stocké par l'application, ni à ses cookies). Le mod ne peut appeler l'API
 * qu'à travers le pont postMessage de l'application, avec les droits de l'utilisateur.
 * `frame-ancestors 'self'` : seule l'application peut l'afficher en iframe.
 */
const CSP = [
  "sandbox allow-scripts allow-modals allow-downloads allow-popups",
  "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
  "connect-src 'self' data: blob:",
  "frame-ancestors 'self'",
  "form-action 'none'",
].join("; ");

const setHeaders = (res) => {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Pas de Cross-Origin-Resource-Policy « same-origin » : la page du mod a une origine opaque,
  // le navigateur bloquerait alors le chargement de ses propres scripts (dont le SDK)
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  // Une mise à jour du mod est prise en compte immédiatement (revalidation par ETag)
  res.setHeader("Cache-Control", "no-cache");
};

const router = express.Router();

router.get("/almanach-sdk.js", (req, res) => {
  setHeaders(res);
  res.sendFile(path.join(__dirname, "..", "mod-sdk", "almanach-sdk.js"));
});

router.use(express.static(MODS_ROOT, { setHeaders, dotfiles: "deny", index: false, fallthrough: false }));

module.exports = { serveModFiles: router };
