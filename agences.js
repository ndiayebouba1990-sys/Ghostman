// U-IMCEC — recherche d'agence.
// La liste complète est déjà dans la page (lisible sans JavaScript et par les moteurs
// de recherche) ; ce script la filtre par texte, région et type de point de service.
(function () {
  "use strict";

  function normaliser(texte) {
    return String(texte || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  document.querySelectorAll("[data-localisateur]").forEach(function (bloc) {
    var champ = bloc.querySelector("[data-recherche]");
    var region = bloc.querySelector("[data-region]");
    var type = bloc.querySelector("[data-type]");
    var etat = bloc.querySelector("[data-etat]");
    var vide = bloc.querySelector("[data-vide]");
    var regionVide = bloc.querySelector("[data-region-vide]");
    var points = Array.prototype.slice.call(bloc.querySelectorAll("[data-point]"));
    var index = points.map(function (p) { return normaliser(p.getAttribute("data-texte")); });

    function filtrer(annoncer) {
      var mots = normaliser(champ ? champ.value : "").split(" ").filter(Boolean);
      var r = region ? region.value : "";
      var t = type ? type.value : "";
      var visibles = 0;
      points.forEach(function (p, i) {
        var ok = mots.every(function (mot) { return index[i].indexOf(mot) !== -1; });
        if (ok && r) ok = p.getAttribute("data-regions").split("|").indexOf(r) !== -1;
        if (ok && t) ok = p.getAttribute("data-type-point") === t;
        p.hidden = !ok;
        if (ok) visibles++;
      });
      if (vide) vide.hidden = visibles > 0;
      if (regionVide) regionVide.textContent = r ? " dans la région de " + r : "";
      if (etat && annoncer !== false) {
        etat.textContent = visibles === 0
          ? "Aucun point de service ne correspond à votre recherche."
          : visibles + (visibles > 1 ? " points de service affichés" : " point de service affiché") + (r ? " — région de " + r : "") + ".";
      }
    }

    [champ, region, type].forEach(function (el) {
      if (!el) return;
      el.addEventListener("input", function () { filtrer(); });
      el.addEventListener("change", function () { filtrer(); });
    });
    var formulaire = bloc.querySelector("form");
    if (formulaire) formulaire.addEventListener("submit", function (e) { e.preventDefault(); filtrer(); });

    var reinit = bloc.querySelector("[data-reinitialiser]");
    if (reinit) reinit.addEventListener("click", function () {
      if (champ) champ.value = "";
      if (region) region.value = "";
      if (type) type.value = "";
      filtrer();
      if (champ) champ.focus();
    });

    // Préremplissage depuis l'adresse : agences.html?region=Thiès&q=mbour
    var params = new URLSearchParams(window.location.search);
    if (bloc.hasAttribute("data-lire-url")) {
      if (region && params.get("region")) {
        var voulu = normaliser(params.get("region"));
        Array.prototype.forEach.call(region.options, function (o) { if (normaliser(o.value) === voulu) region.value = o.value; });
      }
      if (champ && params.get("q")) champ.value = params.get("q").slice(0, 60);
    }
    filtrer();
  });
})();
