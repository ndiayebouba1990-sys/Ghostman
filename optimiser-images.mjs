// Optimisation des images — « npm run images »
//
// Lit   media/originaux/*.jpg|png  +  media/sources.json (crédits, recadrages)
// Écrit src/assets/img/photos/<nom>-<largeur>.webp (+ un JPEG de repli)
//       src/_data/images.json  (dimensions, largeurs disponibles, crédits)
//
// Pour ajouter une photo : déposez le fichier dans media/originaux/, ajoutez
// son crédit dans media/sources.json, puis lancez « npm run images ».

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "media/originaux";
const SORTIE = "src/assets/img/photos";
const LARGEURS = [480, 800, 1200, 1920];
const sources = JSON.parse(fs.readFileSync("media/sources.json", "utf8"));

fs.mkdirSync(SORTIE, { recursive: true });
const manifeste = {};
let total = 0;

for (const fichier of fs.readdirSync(SOURCE).sort()) {
  const ext = path.extname(fichier).toLowerCase();
  if (![".jpg", ".jpeg", ".png"].includes(ext)) continue;
  const nom = path.basename(fichier, ext);
  const infos = sources[nom];
  if (!infos) continue; // seules les images créditées dans sources.json sont publiées

  let image = sharp(path.join(SOURCE, fichier)).rotate();
  let { width, height } = await image.metadata();

  // Recadrage optionnel (fractions à retirer sur chaque bord), ex. { "bas": 0.1 }
  const r = infos.recadrage || {};
  if (r.haut || r.bas || r.gauche || r.droite) {
    const left = Math.round(width * (r.gauche || 0));
    const top = Math.round(height * (r.haut || 0));
    const w = Math.round(width * (1 - (r.gauche || 0) - (r.droite || 0)));
    const h = Math.round(height * (1 - (r.haut || 0) - (r.bas || 0)));
    image = sharp(await image.extract({ left, top, width: w, height: h }).toBuffer());
    width = w; height = h;
  }

  const largeurs = LARGEURS.filter((l) => l <= width);
  if (!largeurs.length || largeurs[largeurs.length - 1] < width && width < LARGEURS[0]) largeurs.push(width);
  for (const l of largeurs) {
    const dest = path.join(SORTIE, `${nom}-${l}.webp`);
    await image.clone().resize({ width: l }).webp({ quality: l >= 1200 ? 72 : 76, effort: 5 }).toFile(dest);
    total += fs.statSync(dest).size;
  }
  const repli = largeurs.includes(1200) ? 1200 : largeurs[largeurs.length - 1];
  const destJpg = path.join(SORTIE, `${nom}-${repli}.jpg`);
  await image.clone().resize({ width: repli }).jpeg({ quality: 74, mozjpeg: true, progressive: true }).toFile(destJpg);
  total += fs.statSync(destJpg).size;

  const { recadrage, ...credit } = infos;
  manifeste[nom] = { largeurs, repli, w: width, h: height, ...credit };
  console.log(`✓ ${nom}  (${width}×${height})  → ${largeurs.join(", ")} px`);
}

fs.writeFileSync("src/_data/images.json", JSON.stringify(manifeste, null, 2) + "\n");
console.log(`\n${Object.keys(manifeste).length} images optimisées — ${(total / 1024 / 1024).toFixed(2)} Mo au total dans ${SORTIE}`);
