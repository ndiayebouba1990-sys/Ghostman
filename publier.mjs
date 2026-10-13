// Publication locale — « npm run publier » (après « npm run build »).
//
// Recopie le site construit (_atelier/_site/) dans le dossier parent, à côté de « _atelier ».
// C'est ce dossier parent que l'on ouvre d'un double-clic sur index.html, et dont on dépose
// le contenu (sans « _atelier ») sur l'hébergement.
//
// Le script ne supprime que les fichiers qu'il avait lui-même publiés la fois précédente
// (liste conservée dans tools/.publication.json) : les autres fichiers du dossier parent,
// comme LISEZ-MOI.txt, ne sont jamais touchés.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ATELIER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ATELIER, "_site");
const CIBLE = path.resolve(ATELIER, "..");
const JOURNAL = path.join(ATELIER, "tools", ".publication.json");

if (!fs.existsSync(path.join(SOURCE, "index.html"))) {
  console.error("Le site n'est pas construit : lancez d'abord « npm run build ».");
  process.exit(1);
}
if (path.parse(CIBLE).root === CIBLE) {
  console.error("Le dossier « _atelier » est à la racine d'un disque : déplacez-le dans un dossier avant de publier.");
  process.exit(1);
}

function lister(dossier, base = dossier, liste = []) {
  for (const nom of fs.readdirSync(dossier)) {
    const chemin = path.join(dossier, nom);
    if (fs.statSync(chemin).isDirectory()) lister(chemin, base, liste);
    else liste.push(path.relative(base, chemin).replace(/\\/g, "/"));
  }
  return liste;
}

const fichiers = lister(SOURCE);
const precedents = fs.existsSync(JOURNAL) ? JSON.parse(fs.readFileSync(JOURNAL, "utf8")).fichiers || [] : [];

// 1. Retirer ce qui avait été publié et n'existe plus.
let retires = 0;
for (const ancien of precedents) {
  if (fichiers.includes(ancien)) continue;
  const chemin = path.join(CIBLE, ancien);
  if (!chemin.startsWith(CIBLE + path.sep) || chemin.startsWith(ATELIER + path.sep)) continue;
  if (fs.existsSync(chemin)) { fs.rmSync(chemin); retires++; }
  const dossier = path.dirname(chemin);
  if (dossier !== CIBLE && fs.existsSync(dossier) && fs.readdirSync(dossier).length === 0) fs.rmdirSync(dossier);
}

// 2. Copier le site.
let copies = 0, octets = 0;
for (const fichier of fichiers) {
  const depuis = path.join(SOURCE, fichier);
  const vers = path.join(CIBLE, fichier);
  fs.mkdirSync(path.dirname(vers), { recursive: true });
  fs.copyFileSync(depuis, vers);
  copies++;
  octets += fs.statSync(depuis).size;
}
fs.writeFileSync(JOURNAL, JSON.stringify({ date: new Date().toISOString(), fichiers }, null, 2));

const pages = fichiers.filter((f) => f.endsWith(".html") && !f.includes("/")).length;
console.log(`\n✓ Site publié dans : ${CIBLE}`);
console.log(`  ${copies} fichiers (${(octets / 1048576).toFixed(1)} Mo), dont ${pages} pages .html${retires ? ` — ${retires} ancien(s) fichier(s) retiré(s)` : ""}.`);
console.log(`  Pour le voir : double-cliquez sur « index.html » dans ce dossier.`);
