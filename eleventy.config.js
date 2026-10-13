// Configuration Eleventy — site institutionnel U-IMCEC Sénégal.
// Entrée : src/ — Sortie : _site/ (dossier à déposer sur l'hébergement).

import path from "node:path";

// Toutes les pages sont des fichiers « .html » posés à la racine du site, et tous les
// liens internes sont RELATIFS. Le site fonctionne donc de la même façon :
//   · ouvert d'un double-clic sur index.html (adresse file://, sans serveur) ;
//   · déposé à la racine d'un hébergement ;
//   · déposé dans un sous-dossier (GitHub Pages, par exemple).
// Dans les gabarits, on écrit les liens avec une barre initiale (« /contact.html ») :
// la transformation « adresses-relatives » ci-dessous retire cette barre à la construction.
const SORTIE = "_site";

function relativiser(adresse, prefixe) {
  if (!adresse.startsWith("/") || adresse.startsWith("//")) return adresse;
  const reste = adresse.slice(1);
  if (reste === "" || /^[?#]/.test(reste)) return prefixe + "index.html" + reste;
  return prefixe + reste;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function versDate(valeur) {
  if (valeur instanceof Date) return valeur;
  return new Date(valeur);
}

export default function (eleventyConfig) {
  // ——— Adresses relatives ———
  // « /contact.html » → « contact.html », « / » → « index.html », y compris dans srcset.
  eleventyConfig.addTransform("adresses-relatives", function (contenu) {
    const sortie = this.page.outputPath || "";
    if (!sortie.endsWith(".html")) return contenu;
    const profondeur = path.relative(SORTIE, path.dirname(sortie)).split(path.sep).filter(Boolean).length;
    const prefixe = "../".repeat(profondeur);
    return contenu
      .replace(/(\s(?:href|src|action|poster)=")(\/[^"]*)"/g, (_, attribut, adresse) => `${attribut}${relativiser(adresse, prefixe)}"`)
      .replace(/(\s(?:srcset|imagesrcset)=")([^"]*)"/g, (_, attribut, liste) =>
        attribut +
        liste
          .split(",")
          .map((candidat) => {
            const [adresse, ...reste] = candidat.trim().split(/\s+/);
            return [relativiser(adresse, prefixe), ...reste].join(" ");
          })
          .join(", ") +
        '"'
      );
  });

  // Fichiers copiés tels quels.
  eleventyConfig.addPassthroughCopy({ "src/assets/img": "assets/img" });
  eleventyConfig.addPassthroughCopy({ "src/assets/fonts": "assets/fonts" });
  eleventyConfig.addPassthroughCopy({ "src/assets/js": "assets/js" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" }, { dot: true });
  eleventyConfig.addPassthroughCopy({ "src/admin/config.yml": "admin/config.yml" });
  eleventyConfig.addWatchTarget("src/assets/");

  // ——— Filtres ———
  // « 2 juin 2026 »
  eleventyConfig.addFilter("dateFr", (valeur) => {
    const d = versDate(valeur);
    const jour = d.getUTCDate();
    return `${jour === 1 ? "1er" : jour} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  });
  // « juin 2026 » — pour les dates dont le jour n'est pas confirmé.
  eleventyConfig.addFilter("moisAnnee", (valeur) => {
    const d = versDate(valeur);
    return `${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  });
  eleventyConfig.addFilter("dateIso", (valeur) => versDate(valeur).toISOString().slice(0, 10));
  eleventyConfig.addFilter("limite", (liste, n) => (liste || []).slice(0, n));
  eleventyConfig.addFilter("sauf", (liste, url) => (liste || []).filter((item) => item.url !== url));
  eleventyConfig.addFilter("json", (valeur) => JSON.stringify(valeur));
  // Numéro lisible « +221 33 832 08 55 » → lien « +221338320855 »
  eleventyConfig.addFilter("tel", (valeur) => String(valeur || "").replace(/[^\d+]/g, ""));
  // Lien de recherche Google Maps à partir d'une adresse (aucune coordonnée inventée).
  eleventyConfig.addFilter("carte", (adresse) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`);
  eleventyConfig.addFilter("itineraire", (adresse) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`);
  // URL absolue (balises canoniques, Open Graph, sitemap).
  eleventyConfig.addFilter("absolu", (chemin, base) => new URL(chemin, base).href);
  // Minification légère de la feuille de style assemblée.
  eleventyConfig.addFilter("cssmin", (css) =>
    String(css)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s*\n\s*/g, "")
      .replace(/\s*([{};,>])\s*/g, "$1")
      .replace(/:\s+/g, ":")
      .replace(/;}/g, "}")
  );

  // ——— Typographie française ———
  // Espaces insécables devant ? ! : ; % » et après « (évite un signe isolé en début de ligne).
  // Appliqué uniquement au texte des pages HTML, jamais à l'intérieur des balises.
  eleventyConfig.addTransform("typographie", function (contenu) {
    if (!(this.page.outputPath || "").endsWith(".html")) return contenu;
    return contenu.replace(/>([^<]+)</g, (_, texte) =>
      ">" +
      texte
        .replace(/ ([?!:;%»])/g, " $1")
        .replace(/« /g, "« ")
        .replace(/n° /g, "n° ")
        .replace(/(\d) (FCFA|millions?|euros?)/g, "$1 $2") +
      "<"
    );
  });

  // ——— Collections ———
  eleventyConfig.addCollection("actualites", (api) =>
    api.getFilteredByGlob("src/actualites/*.md").sort((a, b) => b.date - a.date)
  );
  eleventyConfig.addCollection("solutions", (api) =>
    api.getFilteredByGlob("src/solutions/*.md").sort((a, b) => (a.data.ordre || 99) - (b.data.ordre || 99))
  );

  // Horodatage de construction (invalidation du cache des fichiers CSS/JS).
  eleventyConfig.addGlobalData("build", () => ({
    version: Date.now().toString(36),
    annee: new Date().getFullYear(),
    date: new Date(),
  }));

  return {
    dir: { input: "src", output: SORTIE, includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
