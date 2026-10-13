// Contrôle qualité du site construit — « npm run verifier » (après « npm run build »).
//
// Vérifie, pour chaque page de _site/ :
//   · liens internes et fichiers référencés (images, CSS, JS) existants ;
//   · ancres internes (#…) présentes dans la page cible ;
//   · titre, description, lien canonique, un seul <h1>, hiérarchie des titres ;
//   · titres et descriptions uniques ;
//   · attribut alt sur toutes les images, dimensions réservées ;
//   · aucun lien vide (#), aucun style en ligne, aucun texte de démonstration ;
//   · liens externes en nouvel onglet protégés par rel="noopener" ;
//   · aucune adresse interne commençant par « / » : tous les liens doivent être relatifs,
//     pour que le site s'ouvre aussi d'un double-clic sur index.html (sans serveur).
// Sort avec un code d'erreur s'il reste au moins un problème bloquant.

import fs from "node:fs";
import path from "node:path";

const RACINE = (process.argv.find((a) => a.startsWith("--dossier=")) || "--dossier=_site").split("=")[1];
const erreurs = [];
const alertes = [];
const pages = [];

function parcourir(dossier) {
  for (const nom of fs.readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (fs.statSync(chemin).isDirectory()) parcourir(chemin);
    else if (nom.endsWith(".html")) pages.push(chemin);
  }
}
parcourir(RACINE);

const urlDe = (fichier) => "/" + path.relative(RACINE, fichier).replace(/\\/g, "/").replace(/index\.html$/, "");
const attr = (balise, nom) => (balise.match(new RegExp(`\\s${nom}="([^"]*)"`)) || [])[1];
const texte = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function cibleExiste(lien, depuis) {
  let [chemin] = lien.split("#");
  chemin = chemin.split("?")[0];
  if (chemin === "") return true;
  // Site publié dans un sous-dossier (PATH_PREFIX=/uimcec/) : on retire ce préfixe.
  const prefixe = (process.env.PATH_PREFIX || "/").replace(/\/+$/, "");
  if (prefixe && (chemin === prefixe || chemin.startsWith(prefixe + "/"))) chemin = chemin.slice(prefixe.length) || "/";
  const absolu = chemin.startsWith("/") ? chemin : path.posix.join(path.posix.dirname(depuis), chemin);
  const fichier = path.join(RACINE, decodeURIComponent(absolu));
  if (fs.existsSync(fichier) && fs.statSync(fichier).isFile()) return fichier;
  if (fs.existsSync(path.join(fichier, "index.html"))) return path.join(fichier, "index.html");
  return false;
}

const titres = new Map();
const descriptions = new Map();
let nbLiens = 0, nbImages = 0, nbExternes = 0, nbRelais = 0;
const externes = new Set();

for (const fichier of pages) {
  const url = urlDe(fichier);
  if (url.startsWith("/admin/")) continue; // interface d'administration : hors périmètre
  const html = fs.readFileSync(fichier, "utf8");
  const signaler = (liste, message) => liste.push(`${url}  →  ${message}`);

  // — Adresses relatives uniquement (ouverture directe du fichier, sans serveur) —
  const absolues = [...html.matchAll(/\s(?:href|src|action|poster)="(\/[^"]*)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)) {
    for (const candidat of m[1].split(",")) if (candidat.trim().startsWith("/")) absolues.push(candidat.trim().split(/\s+/)[0]);
  }
  if (absolues.length) signaler(erreurs, `${absolues.length} adresse(s) commençant par « / » (ex. ${absolues[0]}) : le site ne s'ouvrirait plus sans serveur`);

  // — Pages-relais des anciennes adresses : on contrôle seulement leur destination —
  const relais = html.match(/<meta http-equiv="refresh" content="0; url=([^"]+)"/);
  if (relais) {
    nbRelais++;
    if (!cibleExiste(relais[1], url)) signaler(erreurs, `page-relais vers une page absente : ${relais[1]}`);
    continue;
  }

  // — Référencement —
  const titre = texte((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "");
  const description = texte(attr((html.match(/<meta name="description"[^>]*>/) || [""])[0], "content") || "");
  if (!titre) signaler(erreurs, "balise <title> absente");
  else if (titre.length > 70) signaler(alertes, `titre long (${titre.length} caractères)`);
  if (!description) signaler(erreurs, "méta-description absente");
  else if (description.length > 175) signaler(alertes, `description longue (${description.length} caractères)`);
  if (!/<link rel="canonical" href="https?:\/\/[^"]+"/.test(html)) signaler(erreurs, "lien canonique absent");
  if (!/<html lang="fr">/.test(html)) signaler(erreurs, "attribut lang absent");
  if (!/<meta name="viewport" content="width=device-width, initial-scale=1">/.test(html)) signaler(erreurs, "balise viewport incorrecte");
  if (titre) titres.set(titre, [...(titres.get(titre) || []), url]);
  if (description && url !== "/404.html") descriptions.set(description, [...(descriptions.get(description) || []), url]);

  // — Structure des titres —
  const niveaux = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  const nbH1 = niveaux.filter((n) => n === 1).length;
  if (nbH1 !== 1) signaler(erreurs, `${nbH1} balise(s) <h1> (une seule attendue)`);
  for (let i = 1; i < niveaux.length; i++) {
    if (niveaux[i] - niveaux[i - 1] > 1) { signaler(alertes, `saut de niveau de titre : h${niveaux[i - 1]} → h${niveaux[i]}`); break; }
  }
  if (!/<main id="contenu"/.test(html)) signaler(erreurs, "zone <main id=\"contenu\"> absente");

  // — Liens —
  for (const m of html.matchAll(/<a\s[^>]*>/g)) {
    const balise = m[0];
    const href = attr(balise, "href");
    nbLiens++;
    if (href === undefined || href === "" || href === "#") { signaler(erreurs, `lien vide : ${balise.slice(0, 90)}`); continue; }
    if (/^(mailto:|tel:)/.test(href)) continue;
    if (/^https?:\/\//.test(href)) {
      nbExternes++; externes.add(href);
      if (/target="_blank"/.test(balise) && !/rel="[^"]*noopener/.test(balise)) signaler(erreurs, `lien externe sans rel="noopener" : ${href}`);
      continue;
    }
    const cible = cibleExiste(href, url);
    if (!cible) { signaler(erreurs, `lien interne cassé : ${href}`); continue; }
    const ancre = href.split("#")[1];
    if (ancre) {
      const contenuCible = cible === true ? html : fs.readFileSync(cible, "utf8");
      if (!new RegExp(`\\sid="${ancre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(contenuCible)) signaler(erreurs, `ancre introuvable : ${href}`);
    }
  }

  // — Images et autres fichiers —
  for (const m of html.matchAll(/<img\s[^>]*>/g)) {
    const balise = m[0];
    nbImages++;
    if (attr(balise, "alt") === undefined) signaler(erreurs, `image sans attribut alt : ${attr(balise, "src")}`);
    if (!attr(balise, "width") || !attr(balise, "height")) signaler(alertes, `image sans dimensions : ${attr(balise, "src")}`);
    const src = attr(balise, "src");
    if (src && !/^https?:|^data:/.test(src) && !cibleExiste(src, url)) signaler(erreurs, `image introuvable : ${src}`);
  }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const candidat of m[1].split(",")) {
      const src = candidat.trim().split(/\s+/)[0];
      if (src && !cibleExiste(src, url)) signaler(erreurs, `image (srcset) introuvable : ${src}`);
    }
  }
  for (const m of html.matchAll(/<(?:link|script)\s[^>]*(?:href|src)="([^"]+)"/g)) {
    if (/rel="canonical"/.test(m[0]) || /^(https?:|data:)/.test(m[1])) continue;
    if (!cibleExiste(m[1], url)) signaler(erreurs, `fichier introuvable : ${m[1]}`);
  }

  // — Sécurité et propreté —
  if (/\sstyle="/.test(html)) signaler(erreurs, "attribut style en ligne (bloqué par la politique de sécurité)");
  if (/<script(?![^>]*\bsrc=)(?![^>]*type="application\/(ld\+)?json")[^>]*>/.test(html)) signaler(erreurs, "script en ligne (bloqué par la politique de sécurité)");
  if (/lorem ipsum|exchang@gmail|undefined|\[object Object\]|\bNaN\b/i.test(texte(html))) signaler(erreurs, "texte de démonstration ou valeur non résolue");
  for (const m of html.matchAll(/<button\s[^>]*>/g)) if (!attr(m[0], "type")) signaler(alertes, "bouton sans attribut type");
}

for (const [titre, urls] of titres) if (urls.length > 1) erreurs.push(`titre en double « ${titre} » : ${urls.join(", ")}`);
for (const [, urls] of descriptions) if (urls.length > 1) erreurs.push(`description en double : ${urls.join(", ")}`);

// — Fichiers attendus —
for (const attendu of ["index.html", "cookies.html", "sitemap.xml", "robots.txt", "404.html", ".htaccess", "api/contact.php", "assets/css/site.css", "assets/js/site.js", "assets/js/preferences.js"]) {
  if (!fs.existsSync(path.join(RACINE, attendu))) erreurs.push(`fichier attendu absent : ${attendu}`);
}
const sitemap = fs.existsSync(path.join(RACINE, "sitemap.xml")) ? fs.readFileSync(path.join(RACINE, "sitemap.xml"), "utf8") : "";
const nbSitemap = (sitemap.match(/<loc>/g) || []).length;

// — Poids —
const poids = (f) => (fs.existsSync(path.join(RACINE, f)) ? fs.statSync(path.join(RACINE, f)).size : 0);
const ko = (o) => (o / 1024).toFixed(1) + " Ko";

console.log(`\nPages contrôlées : ${pages.length} (dont ${nbRelais} pages-relais)   Liens : ${nbLiens} (dont ${nbExternes} externes, ${externes.size} adresses distinctes)   Images : ${nbImages}`);
console.log(`Plan du site : ${nbSitemap} adresses   Feuille de style : ${ko(poids("assets/css/site.css"))}   Scripts : ${ko(poids("assets/js/site.js") + poids("assets/js/agences.js") + poids("assets/js/contact.js") + poids("assets/js/preferences.js"))}   Accueil (HTML) : ${ko(poids("index.html"))}`);
if (process.argv.includes("--externes")) console.log("\nLiens externes :\n  " + [...externes].sort().join("\n  "));
if (alertes.length) console.log(`\n${alertes.length} point(s) d'attention :\n  ` + alertes.join("\n  "));
if (erreurs.length) {
  console.error(`\n${erreurs.length} erreur(s) :\n  ` + erreurs.join("\n  "));
  process.exit(1);
}
console.log("\n✓ Aucune erreur bloquante.");
