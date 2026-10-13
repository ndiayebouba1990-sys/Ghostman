// U-IMCEC — cookies de préférences et personnalisation (aucune dépendance, aucun service tiers).
//
// Principe : rien n'est retenu sans l'accord du visiteur. Avec son accord, le site mémorise
// dans le navigateur les sujets consultés ou choisis et la région de sa recherche d'agence,
// puis s'en sert pour lui présenter d'abord ce qui l'intéresse. Ces préférences sont lues par
// ce script uniquement : elles ne sont ni enregistrées côté serveur, ni partagées avec un tiers.
//
// Stockage : de vrais cookies quand le site est en ligne (http ou https). Quand le site est
// ouvert directement depuis un dossier (adresse file://), les navigateurs refusent les
// cookies : le script utilise alors le stockage local du navigateur, avec les mêmes règles.
(function () {
  "use strict";

  var source = document.getElementById("donnees-preferences");
  if (!source) return;
  var config;
  try { config = JSON.parse(source.textContent); } catch (e) { return; }

  var INTERETS = config.interets || [];
  var DUREE = (config.duree_jours || 180) * 86400; // en secondes
  var NOM_CONSENTEMENT = "uimcec_consentement";
  var NOM_PREFERENCES = "uimcec_preferences";
  var SCORE_MAX = 40;
  var BONUS_CHOIX = 6; // un sujet choisi par le visiteur passe devant un sujet simplement consulté

  function interet(cle) {
    for (var i = 0; i < INTERETS.length; i++) if (INTERETS[i].cle === cle) return INTERETS[i];
    return null;
  }
  function aujourdhui() { return new Date().toISOString().slice(0, 10); }
  function dateFr(iso) { var p = String(iso || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : ""; }
  function creer(balise, classe, texte) {
    var el = document.createElement(balise);
    if (classe) el.className = classe;
    if (texte) el.textContent = texte;
    return el;
  }
  function icone(nom) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "ico");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + nom);
    svg.appendChild(use);
    return svg;
  }

  /* ——— Stockage : cookie en ligne, stockage local hors ligne, sinon mémoire de la page ——— */
  var stockage = (function () {
    var memoire = {};
    var enLigne = /^https?:$/.test(location.protocol);
    var mode = "memoire";
    if (enLigne && navigator.cookieEnabled) mode = "cookie";
    else { try { window.localStorage.getItem(NOM_CONSENTEMENT); mode = "local"; } catch (e) { mode = "memoire"; } }

    return {
      mode: mode,
      lire: function (nom) {
        try {
          if (mode === "cookie") {
            var m = document.cookie.match(new RegExp("(?:^|; )" + nom + "=([^;]*)"));
            return m ? decodeURIComponent(m[1]) : null;
          }
          if (mode === "local") {
            var brut = window.localStorage.getItem(nom);
            if (!brut) return null;
            var paquet = JSON.parse(brut);
            if (!paquet || paquet.e < Date.now()) { window.localStorage.removeItem(nom); return null; }
            return paquet.v;
          }
        } catch (e) { return null; }
        return Object.prototype.hasOwnProperty.call(memoire, nom) ? memoire[nom] : null;
      },
      ecrire: function (nom, valeur) {
        try {
          if (mode === "cookie") {
            document.cookie = nom + "=" + encodeURIComponent(valeur) + "; Max-Age=" + DUREE + "; Path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
            return;
          }
          if (mode === "local") { window.localStorage.setItem(nom, JSON.stringify({ v: valeur, e: Date.now() + DUREE * 1000 })); return; }
        } catch (e) { /* stockage refusé : on garde la valeur pour la page en cours */ }
        memoire[nom] = valeur;
      },
      effacer: function (nom) {
        try {
          if (mode === "cookie") document.cookie = nom + "=; Max-Age=0; Path=/; SameSite=Lax";
          if (mode === "local") window.localStorage.removeItem(nom);
        } catch (e) { /* rien à effacer */ }
        delete memoire[nom];
      }
    };
  })();

  // Mémoire de session : évite de compter deux fois la même page pendant une visite.
  var session = {
    lire: function (cle) { try { return window.sessionStorage.getItem(cle); } catch (e) { return null; } },
    ecrire: function (cle, v) { try { window.sessionStorage.setItem(cle, v); } catch (e) { /* sans importance */ } },
    effacer: function (cle) { try { window.sessionStorage.removeItem(cle); } catch (e) { /* sans importance */ } }
  };

  /* ——— Consentement ——— */
  function lireConsentement() {
    var brut = stockage.lire(NOM_CONSENTEMENT);
    if (!brut) return null;
    try { var c = JSON.parse(brut); return c && c.v === 1 ? c : null; } catch (e) { return null; }
  }
  function enregistrerConsentement(personnalisation) {
    stockage.ecrire(NOM_CONSENTEMENT, JSON.stringify({ v: 1, p: personnalisation ? 1 : 0, d: aujourdhui() }));
    if (!personnalisation) effacerPreferences();
  }
  function personnalisationActive() { var c = lireConsentement(); return !!(c && c.p); }

  /* ——— Préférences ——— */
  function lirePreferences() {
    var p = { i: {}, e: [], r: "", d: "", n: 0, j: "" };
    var brut = stockage.lire(NOM_PREFERENCES);
    if (!brut) return p;
    try {
      var lu = JSON.parse(brut);
      if (lu && typeof lu === "object") {
        if (lu.i && typeof lu.i === "object") Object.keys(lu.i).forEach(function (cle) { if (interet(cle) && lu.i[cle] > 0) p.i[cle] = Math.min(SCORE_MAX, Number(lu.i[cle]) || 0); });
        if (Array.isArray(lu.e)) p.e = lu.e.filter(function (cle) { return !!interet(cle); });
        p.r = typeof lu.r === "string" ? lu.r.slice(0, 40) : "";
        p.d = interet(lu.d) ? lu.d : "";
        p.n = Number(lu.n) || 0;
        p.j = typeof lu.j === "string" ? lu.j : "";
      }
    } catch (e) { /* valeur illisible : on repart de zéro */ }
    return p;
  }
  function ecrirePreferences(p) {
    if (!personnalisationActive()) return;
    p.j = aujourdhui();
    stockage.ecrire(NOM_PREFERENCES, JSON.stringify(p));
  }
  function effacerPreferences() {
    stockage.effacer(NOM_PREFERENCES);
    session.effacer("uimcec_pages");
    session.effacer("uimcec_visite");
  }
  function noter(cle, points) {
    if (!personnalisationActive() || !interet(cle)) return;
    var p = lirePreferences();
    p.i[cle] = (p.i[cle] || 0) + points;
    if (p.i[cle] > SCORE_MAX) Object.keys(p.i).forEach(function (c) { p.i[c] = Math.round(p.i[c] / 2); });
    if (points >= 2) p.d = cle;
    ecrirePreferences(p);
  }
  // Sujets classés du plus au moins important pour ce visiteur.
  function classement(p) {
    return INTERETS
      .map(function (it, rang) { return { it: it, rang: rang, choisi: p.e.indexOf(it.cle) !== -1, score: (p.i[it.cle] || 0) + (p.e.indexOf(it.cle) !== -1 ? BONUS_CHOIX : 0) }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.rang - b.rang; });
  }

  /* ——— Suivi des centres d'intérêt (uniquement avec accord) ——— */
  function dejaVu(marque) {
    var vues = (session.lire("uimcec_pages") || "").split("|");
    if (vues.indexOf(marque) !== -1) return true;
    vues.push(marque);
    session.ecrire("uimcec_pages", vues.filter(Boolean).join("|"));
    return false;
  }
  function suivreLaPage() {
    if (!personnalisationActive()) return;
    if (!session.lire("uimcec_visite")) {
      session.ecrire("uimcec_visite", "1");
      var p = lirePreferences();
      p.n = Math.min(999, p.n + 1);
      ecrirePreferences(p);
    }
    var sujet = document.body.getAttribute("data-interet");
    if (!sujet) return;
    if (!dejaVu("vue:" + sujet)) noter(sujet, 2);
    // Une lecture prolongée compte un peu plus qu'un simple passage.
    setTimeout(function () {
      if (document.visibilityState === "visible" && !dejaVu("lecture:" + sujet)) noter(sujet, 1);
    }, 25000);
  }
  document.addEventListener("click", function (e) {
    var lien = e.target.closest ? e.target.closest("a[data-interet]") : null;
    if (lien) noter(lien.getAttribute("data-interet"), Number(lien.getAttribute("data-points")) || 1);
  });
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (!el || !el.matches) return;
    if (el.matches("[data-region]") && personnalisationActive() && !el.hasAttribute("data-sans-memoire")) {
      var p = lirePreferences();
      p.r = el.value || "";
      ecrirePreferences(p);
      if (el.value) noter("agence", 1);
      afficherRegionMemorisee();
    }
    if (el.matches("[data-formulaire-contact] [name=sujet]") && el.value) {
      for (var i = 0; i < INTERETS.length; i++) if (INTERETS[i].sujet === el.value && INTERETS[i].cle === el.value) noter(INTERETS[i].cle, 3);
    }
  });

  /* ——— Personnalisation de l'affichage ——— */
  function personnaliserAccueil(p, ordre) {
    var grille = document.querySelector("[data-besoins]");
    if (grille && ordre.length) {
      var rangs = {};
      ordre.forEach(function (x, n) { rangs[x.it.cle] = n; });
      var items = Array.prototype.slice.call(grille.children);
      items
        .map(function (li, n) {
          var a = li.querySelector("a[data-interet]");
          var cle = a ? a.getAttribute("data-interet") : "";
          return { li: li, n: n, rang: Object.prototype.hasOwnProperty.call(rangs, cle) ? rangs[cle] : 100 + n };
        })
        .sort(function (a, b) { return a.rang - b.rang; })
        .forEach(function (x, position) {
          grille.appendChild(x.li);
          var a = x.li.querySelector("a");
          var ancienne = x.li.querySelector(".besoin__marque");
          if (ancienne) ancienne.remove();
          if (a) a.classList.toggle("besoin--pour-vous", position === 0 && x.rang < 100);
          if (a && position === 0 && x.rang < 100) a.appendChild(creer("span", "besoin__marque", "Pour vous"));
        });
    }

    var bloc = document.querySelector("[data-pour-vous]");
    if (!bloc) return;
    var principal = ordre[0];
    if (!principal || (p.n < 2 && principal.score < 3)) { bloc.hidden = true; return; }
    var zone = bloc.querySelector("[data-pour-vous-contenu]");
    zone.textContent = "";

    var texte = creer("div", "pour-vous__texte");
    texte.appendChild(creer("p", "pour-vous__surtitre", p.n >= 2 ? "Bon retour parmi nous" : "Sélectionné pour vous"));
    var phrase = creer("p", "pour-vous__titre");
    phrase.appendChild(document.createTextNode("Vous vous intéressez à : "));
    ordre.slice(0, 2).forEach(function (x, n) {
      if (n) phrase.appendChild(document.createTextNode(" et "));
      phrase.appendChild(creer("strong", "", x.it.libelle.toLowerCase()));
    });
    phrase.appendChild(document.createTextNode("."));
    texte.appendChild(phrase);
    zone.appendChild(texte);

    var actions = creer("div", "pour-vous__actions");
    var reprendre = creer("a", "btn btn--primaire btn--petit", "Reprendre : " + principal.it.libelle);
    reprendre.href = principal.it.url;
    actions.appendChild(reprendre);
    if (principal.it.cle !== "agence") {
      var demander = creer("a", "btn btn--contour btn--petit", "Demander des renseignements");
      demander.href = bloc.getAttribute("data-url-contact") + "?sujet=" + encodeURIComponent(principal.it.sujet);
      actions.appendChild(demander);
    }
    if (p.r) {
      var agences = creer("a", "btn btn--contour btn--petit", "Agences · " + p.r);
      agences.href = bloc.getAttribute("data-url-agences") + "?region=" + encodeURIComponent(p.r);
      actions.appendChild(agences);
    }
    zone.appendChild(actions);
    bloc.hidden = false;
  }

  function afficherRegionMemorisee() {
    var p = personnalisationActive() ? lirePreferences() : null;
    document.querySelectorAll("[data-region-memo]").forEach(function (note) {
      note.hidden = !(p && p.r);
      var nom = note.querySelector("[data-region-nom]");
      if (nom && p) nom.textContent = p.r;
    });
  }
  function personnaliserAgences(p) {
    if (!p.r) return;
    var parametres = new URLSearchParams(window.location.search);
    document.querySelectorAll("[data-localisateur]").forEach(function (bloc) {
      var region = bloc.querySelector("[data-region]");
      if (!region || region.value || (bloc.hasAttribute("data-lire-url") && (parametres.get("region") || parametres.get("q")))) return;
      var existe = Array.prototype.some.call(region.options, function (o) { return o.value === p.r; });
      if (!existe) return;
      region.value = p.r;
      region.setAttribute("data-sans-memoire", "");
      region.dispatchEvent(new Event("change", { bubbles: true }));
      region.removeAttribute("data-sans-memoire");
    });
    afficherRegionMemorisee();
  }
  document.addEventListener("click", function (e) {
    var bouton = e.target.closest ? e.target.closest("[data-region-oublier]") : null;
    if (!bouton) return;
    var p = lirePreferences();
    p.r = "";
    ecrirePreferences(p);
    var bloc = bouton.closest("[data-localisateur]");
    var region = bloc ? bloc.querySelector("[data-region]") : null;
    if (region) { region.value = ""; region.dispatchEvent(new Event("change", { bubbles: true })); region.focus(); }
    afficherRegionMemorisee();
  });

  function personnaliserContact(p, ordre) {
    var formulaire = document.querySelector("[data-formulaire-contact]");
    if (!formulaire || !ordre.length) return;
    var sujet = formulaire.querySelector("[name=sujet]");
    var principal = ordre[0].it;
    if (sujet && !sujet.value && principal.sujet !== "autre") {
      sujet.value = principal.sujet;
      var aide = formulaire.querySelector("[data-sujet-suggere]");
      if (aide) aide.hidden = false;
    }
    var bloc = formulaire.querySelector("[data-interets-bloc]");
    var caseJoindre = formulaire.querySelector("[data-interets-joints]");
    var liste = formulaire.querySelector("[data-interets-liste]");
    if (!bloc || !caseJoindre || !liste) return;
    var libelles = ordre.slice(0, 4).map(function (x) { return x.it.libelle; });
    liste.textContent = libelles.join(", ");
    caseJoindre.setAttribute("data-texte", "Sujets consultés sur le site : " + libelles.join(", ") + (p.r ? " — région recherchée : " + p.r : ""));
    bloc.hidden = false;
  }

  function personnaliser() {
    var actif = personnalisationActive();
    var p = actif ? lirePreferences() : { i: {}, e: [], r: "", d: "", n: 0 };
    var ordre = actif ? classement(p) : [];
    var blocPourVous = document.querySelector("[data-pour-vous]");
    if (!actif) {
      if (blocPourVous) blocPourVous.hidden = true;
      document.querySelectorAll(".besoin__marque").forEach(function (m) { m.remove(); });
      document.querySelectorAll(".besoin--pour-vous").forEach(function (a) { a.classList.remove("besoin--pour-vous"); });
      afficherRegionMemorisee();
      return;
    }
    personnaliserAccueil(p, ordre);
    personnaliserAgences(p);
    personnaliserContact(p, ordre);
  }

  /* ——— Bandeau de consentement ——— */
  var bandeau = document.querySelector("[data-cookies]");
  var avis = document.querySelector("[data-cookies-avis]");
  var declencheur = null;

  function annoncer(texte) {
    if (!avis) return;
    avis.textContent = texte;
    avis.hidden = false;
    clearTimeout(annoncer.minuterie);
    annoncer.minuterie = setTimeout(function () { avis.hidden = true; }, 5000);
  }
  function montrerVue(nom) {
    if (!bandeau) return;
    bandeau.querySelectorAll("[data-cookies-vue]").forEach(function (vue) { vue.hidden = vue.getAttribute("data-cookies-vue") !== nom; });
  }
  function synchroniserReglages(racine) {
    var actif = personnalisationActive();
    var p = lirePreferences();
    racine.querySelectorAll("[data-cookies-perso]").forEach(function (c) { c.checked = actif; });
    racine.querySelectorAll("[data-cookies-interet]").forEach(function (c) { c.checked = actif && p.e.indexOf(c.value) !== -1; });
    majSujets(racine);
  }
  function majSujets(racine) {
    var perso = racine.querySelector("[data-cookies-perso]");
    var zone = racine.querySelector("[data-cookies-sujets]");
    if (perso && zone) zone.hidden = !perso.checked;
  }
  function ouvrirBandeau(vue, origine) {
    if (!bandeau) return;
    declencheur = origine || null;
    synchroniserReglages(bandeau);
    montrerVue(vue);
    bandeau.hidden = false;
    if (origine) { var titre = bandeau.querySelector("[data-cookies-vue=" + vue + "] [data-cookies-titre]"); if (titre) titre.focus(); }
  }
  function fermerBandeau() {
    if (!bandeau) return;
    bandeau.hidden = true;
    if (declencheur && declencheur.focus) declencheur.focus();
    declencheur = null;
  }
  function appliquerChoix(personnalisation, choisis, message) {
    enregistrerConsentement(personnalisation);
    if (personnalisation) {
      var p = lirePreferences();
      if (choisis) p.e = choisis;
      ecrirePreferences(p);
      suivreLaPage();
    }
    personnaliser();
    actualiserCentre();
    fermerBandeau();
    annoncer(message || (personnalisation ? "C'est noté : le site s'adaptera à vos centres d'intérêt." : "C'est noté : aucune préférence ne sera retenue."));
  }
  function sujetsCoches(racine) {
    return Array.prototype.slice.call(racine.querySelectorAll("[data-cookies-interet]:checked")).map(function (c) { return c.value; });
  }

  if (bandeau) {
    bandeau.addEventListener("click", function (e) {
      var cible = e.target.closest ? e.target.closest("button") : null;
      if (!cible) return;
      if (cible.hasAttribute("data-cookies-accepter")) appliquerChoix(true, null);
      else if (cible.hasAttribute("data-cookies-refuser")) appliquerChoix(false, null);
      else if (cible.hasAttribute("data-cookies-personnaliser")) { montrerVue("detail"); var t = bandeau.querySelector("[data-cookies-vue=detail] [data-cookies-titre]"); if (t) t.focus(); }
      else if (cible.hasAttribute("data-cookies-retour")) montrerVue("resume");
      else if (cible.hasAttribute("data-cookies-enregistrer")) {
        var perso = bandeau.querySelector("[data-cookies-perso]");
        appliquerChoix(!!(perso && perso.checked), sujetsCoches(bandeau), "Vos choix sont enregistrés.");
      }
      else if (cible.hasAttribute("data-cookies-fermer")) fermerBandeau();
    });
    bandeau.addEventListener("change", function (e) { if (e.target.matches("[data-cookies-perso]")) majSujets(bandeau); });
    document.addEventListener("keydown", function (e) {
      // Échap ne ferme le panneau que si un choix a déjà été fait (sinon il reste proposé).
      if (e.key === "Escape" && !bandeau.hidden && lireConsentement()) fermerBandeau();
    });
  }
  document.addEventListener("click", function (e) {
    var bouton = e.target.closest ? e.target.closest("[data-ouvrir-cookies]") : null;
    if (bouton) { e.preventDefault(); ouvrirBandeau("detail", bouton); }
  });

  /* ——— Centre de préférences (page « Cookies et préférences ») ——— */
  var centre = document.querySelector("[data-centre-preferences]");

  function niveau(x) {
    if (x.choisi) return "choisi par vous";
    if (x.score >= 10) return "sujet principal";
    if (x.score >= 4) return "souvent consulté";
    return "consulté";
  }
  function actualiserCentre() {
    if (!centre) return;
    var consentement = lireConsentement();
    var actif = !!(consentement && consentement.p);
    var p = lirePreferences();
    var ordre = actif ? classement(p) : [];

    var etat = centre.querySelector("[data-centre-etat]");
    if (etat) {
      etat.textContent = !consentement
        ? "Vous n'avez pas encore fait de choix : aucune préférence n'est retenue."
        : (actif ? "Personnalisation activée" : "Personnalisation refusée") + " — choix du " + dateFr(consentement.d) + ".";
      etat.className = "centre__etat" + (actif ? " centre__etat--actif" : "");
    }
    var mode = centre.querySelector("[data-centre-mode]");
    if (mode) {
      mode.textContent = stockage.mode === "cookie"
        ? "Vos choix sont conservés dans des cookies déposés par ce site uniquement."
        : stockage.mode === "local"
          ? "Aperçu hors ligne : le site est ouvert depuis un dossier, où les navigateurs n'acceptent pas les cookies. Vos choix sont conservés dans le stockage local du navigateur ; une fois le site en ligne, ce seront des cookies."
          : "Votre navigateur bloque tout stockage : vos choix ne valent que pour la page en cours.";
    }
    synchroniserReglages(centre);

    var retenu = centre.querySelector("[data-centre-retenu]");
    if (retenu) {
      retenu.textContent = "";
      if (!actif) retenu.appendChild(creer("p", "centre__vide", "Rien : la personnalisation n'est pas activée."));
      else if (!ordre.length && !p.r) retenu.appendChild(creer("p", "centre__vide", "Rien pour l'instant : naviguez sur le site ou choisissez vos sujets ci-dessus."));
      else {
        var liste = creer("ul", "centre__liste");
        liste.setAttribute("role", "list");
        ordre.forEach(function (x) {
          var li = creer("li", "centre__ligne");
          var pastille = creer("span", "pastille");
          pastille.appendChild(icone(x.it.icone));
          li.appendChild(pastille);
          var bloc = creer("span", "");
          bloc.appendChild(creer("strong", "", x.it.libelle));
          bloc.appendChild(creer("span", "", niveau(x)));
          li.appendChild(bloc);
          liste.appendChild(li);
        });
        if (p.r) {
          var liRegion = creer("li", "centre__ligne");
          var past = creer("span", "pastille");
          past.appendChild(icone("repere"));
          liRegion.appendChild(past);
          var blocRegion = creer("span", "");
          blocRegion.appendChild(creer("strong", "", "Région : " + p.r));
          blocRegion.appendChild(creer("span", "", "dernière recherche d'agence"));
          liRegion.appendChild(blocRegion);
          liste.appendChild(liRegion);
        }
        retenu.appendChild(liste);
        retenu.appendChild(creer("p", "centre__visites", p.n > 1 ? p.n + " visites comptées depuis votre accord." : "Première visite depuis votre accord."));
      }
    }
    var brut = centre.querySelector("[data-centre-brut]");
    if (brut) {
      var c = stockage.lire(NOM_CONSENTEMENT), v = stockage.lire(NOM_PREFERENCES);
      brut.textContent = (c ? NOM_CONSENTEMENT + " = " + c : NOM_CONSENTEMENT + " : absent") + "\n" + (v ? NOM_PREFERENCES + " = " + v : NOM_PREFERENCES + " : absent");
    }
    var effacer = centre.querySelector("[data-centre-effacer]");
    if (effacer) effacer.disabled = !actif || (!ordre.length && !p.r && !p.n);
  }
  if (centre) {
    centre.addEventListener("change", function (e) {
      if (e.target.matches("[data-cookies-perso]")) {
        appliquerChoix(e.target.checked, e.target.checked ? sujetsCoches(centre) : null, e.target.checked ? "Personnalisation activée." : "Personnalisation désactivée : vos préférences ont été effacées.");
      } else if (e.target.matches("[data-cookies-interet]")) {
        if (!personnalisationActive()) return;
        var p = lirePreferences();
        p.e = sujetsCoches(centre);
        ecrirePreferences(p);
        actualiserCentre();
        annoncer("Vos sujets sont enregistrés.");
      }
    });
    centre.addEventListener("click", function (e) {
      var bouton = e.target.closest ? e.target.closest("button") : null;
      if (!bouton) return;
      if (bouton.hasAttribute("data-centre-effacer")) {
        effacerPreferences();
        personnaliser();
        actualiserCentre();
        annoncer("Vos préférences ont été effacées.");
      } else if (bouton.hasAttribute("data-centre-accepter")) appliquerChoix(true, sujetsCoches(centre));
      else if (bouton.hasAttribute("data-centre-refuser")) appliquerChoix(false, null);
    });
  }

  /* ——— Démarrage ——— */
  suivreLaPage();
  personnaliser();
  actualiserCentre();
  // Premier passage : on propose le choix, sans bloquer la lecture. Si le navigateur signale
  // un refus global du suivi (Global Privacy Control), on ne sollicite pas le visiteur :
  // rien n'est retenu, et le lien « Gérer mes cookies » du pied de page reste disponible.
  if (bandeau && !lireConsentement() && !centre && navigator.globalPrivacyControl !== true) ouvrirBandeau("resume", null);
})();
