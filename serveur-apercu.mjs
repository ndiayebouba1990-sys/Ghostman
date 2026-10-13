// Serveur d'aperçu local — AUCUNE dépendance.
//   npm run apercu            → http://localhost:8080
//   npm run apercu -- 3000    → autre port
//
// Sert le dossier _site/ et simule le point de traitement du formulaire
// (/api/contact.php) avec les MÊMES règles de validation que la version PHP
// de production. En aperçu, les messages ne sont PAS transmis à U-IMCEC :
// ils sont écrits dans tools/.apercu/messages.jsonl et la réponse porte
// « apercu: true » pour que l'interface l'indique clairement au visiteur.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
const JOURNAL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".apercu", "messages.jsonl");
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".avif": "image/avif",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2",
  ".yml": "text/yaml; charset=utf-8", ".webmanifest": "application/manifest+json",
};

// ——— Règles de validation (identiques à src/static/api/contact.php) ———
export const SUJETS = ["epargne", "credit", "agricole", "numerique", "compte", "agence", "reclamation", "autre"];

export function validerDemande(d) {
  const erreurs = {};
  const txt = (v) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  const nom = txt(d.nom), telephone = txt(d.telephone), email = txt(d.email);
  const sujet = txt(d.sujet), localite = txt(d.localite);
  let message = txt(d.message);

  if (txt(d.site_web) !== "") return { robot: true };                       // champ piège
  if (nom.length < 2 || nom.length > 80) erreurs.nom = "Indiquez votre nom (2 à 80 caractères).";
  if (!/^[+\d][\d\s().-]{6,19}$/.test(telephone)) erreurs.telephone = "Indiquez un numéro de téléphone valide.";
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) erreurs.email = "L'adresse e-mail n'est pas valide.";
  if (!SUJETS.includes(sujet)) erreurs.sujet = "Choisissez l'objet de votre demande.";
  if (localite.length > 80) erreurs.localite = "Localité trop longue (80 caractères maximum).";
  if (message.length < 10 || message.length > 2000) erreurs.message = "Votre message doit contenir entre 10 et 2000 caractères.";
  if (txt(d.consentement) !== "oui") erreurs.consentement = "Votre accord est nécessaire pour traiter la demande.";

  // Masque toute suite de 13 à 19 chiffres (numéro de carte saisi par erreur).
  message = message.replace(/(?:\d[ -]?){13,19}/g, "[numéro masqué] ");

  if (Object.keys(erreurs).length) return { erreurs };
  return { valeurs: { nom, telephone, email, sujet, localite, message } };
}

// ——— Limitation de débit : 5 envois par 10 minutes et par adresse ———
const envois = new Map();
function debitDepasse(ip) {
  const maintenant = Date.now();
  const recents = (envois.get(ip) || []).filter((t) => maintenant - t < 10 * 60 * 1000);
  recents.push(maintenant);
  envois.set(ip, recents);
  return recents.length > 5;
}

function repondreJson(res, statut, corps) {
  res.writeHead(statut, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(corps));
}

function traiterContact(req, res) {
  if (req.method !== "POST") return repondreJson(res, 405, { ok: false, message: "Méthode non autorisée." });
  const morceaux = [];
  let taille = 0;
  req.on("data", (m) => {
    taille += m.length;
    if (taille > 20000) { repondreJson(res, 413, { ok: false, message: "Demande trop volumineuse." }); req.destroy(); }
    else morceaux.push(m);
  });
  req.on("end", () => {
    if (res.writableEnded) return;
    const brut = Buffer.concat(morceaux).toString("utf8");
    let donnees = {};
    try {
      donnees = (req.headers["content-type"] || "").includes("application/json")
        ? JSON.parse(brut || "{}")
        : Object.fromEntries(new URLSearchParams(brut));
    } catch { return repondreJson(res, 400, { ok: false, message: "Format de demande invalide." }); }

    if (debitDepasse(req.socket.remoteAddress)) return repondreJson(res, 429, { ok: false, message: "Trop de demandes. Réessayez dans quelques minutes." });

    const resultat = validerDemande(donnees);
    if (resultat.robot) return repondreJson(res, 200, { ok: true, apercu: true });   // réponse neutre pour les robots
    if (resultat.erreurs) return repondreJson(res, 422, { ok: false, erreurs: resultat.erreurs, message: "Certains champs sont à corriger." });

    fs.mkdirSync(path.dirname(JOURNAL), { recursive: true });
    fs.appendFileSync(JOURNAL, JSON.stringify({ date: new Date().toISOString(), ...resultat.valeurs }) + "\n");
    repondreJson(res, 200, { ok: true, apercu: true });
  });
}

function servirFichier(req, res) {
  let chemin;
  try { chemin = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { res.writeHead(400); return res.end(); }
  let cible = path.normalize(path.join(RACINE, chemin));
  if (!cible.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(cible) && fs.statSync(cible).isDirectory()) {
    if (!chemin.endsWith("/")) { res.writeHead(301, { Location: chemin + "/" }); return res.end(); }
    cible = path.join(cible, "index.html");
  }
  if (path.basename(cible).startsWith(".") || cible.endsWith(".php")) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(cible)) {
    const page404 = path.join(RACINE, "404.html");
    res.writeHead(404, { "Content-Type": MIME[".html"] });
    return res.end(fs.existsSync(page404) ? fs.readFileSync(page404) : "404");
  }
  const type = MIME[path.extname(cible).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(cible).pipe(res);
}

const estLanceDirectement = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (estLanceDirectement) {
  if (!fs.existsSync(RACINE)) {
    console.error("Le dossier _site/ est absent : lancez d'abord « npm run build ».");
    process.exit(1);
  }
  http
    .createServer((req, res) => {
      const chemin = new URL(req.url, "http://x").pathname;
      if (chemin === "/api/contact.php") return traiterContact(req, res);
      servirFichier(req, res);
    })
    .listen(PORT, () => console.log(`Aperçu U-IMCEC : http://localhost:${PORT}  (Ctrl+C pour arrêter)`));
}
