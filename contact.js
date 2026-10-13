// U-IMCEC — formulaire de contact.
// 1. Contrôle des champs dans le navigateur (mêmes règles que le serveur).
// 2. Envoi au point de traitement (attribut « action » du formulaire).
// 3. Si le service ne répond pas, l'utilisateur n'est jamais laissé sans solution :
//    son message est repris dans un e-mail prérempli et le téléphone est rappelé.
(function () {
  "use strict";

  var formulaire = document.querySelector("[data-formulaire-contact]");
  if (!formulaire) return;

  var retour = formulaire.querySelector("[data-retour]");
  var bouton = formulaire.querySelector("[type=submit]");
  var libelleBouton = bouton.innerHTML;
  var courriel = formulaire.getAttribute("data-courriel");
  var telephone = formulaire.getAttribute("data-telephone");
  var debut = Date.now();

  // Objet présélectionné quand on arrive d'une page de solution : contact.html?sujet=credit
  var voulu = new URLSearchParams(window.location.search).get("sujet");
  var listeSujets = formulaire.querySelector("[name=sujet]");
  if (voulu && listeSujets) Array.prototype.forEach.call(listeSujets.options, function (o) { if (o.value === voulu) listeSujets.value = voulu; });

  var regles = {
    nom: function (v) { return v.length >= 2 && v.length <= 80 ? "" : "Indiquez votre nom (2 à 80 caractères)."; },
    telephone: function (v) { return /^[+\d][\d\s().-]{6,19}$/.test(v) ? "" : "Indiquez un numéro de téléphone valide, par exemple 77 123 45 67."; },
    email: function (v) { return !v || (v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) ? "" : "L'adresse e-mail n'est pas valide."; },
    sujet: function (v) { return v ? "" : "Choisissez l'objet de votre demande."; },
    message: function (v) { return v.length >= 10 && v.length <= 2000 ? "" : "Votre message doit contenir entre 10 et 2000 caractères."; },
    consentement: function (v, champ) { return champ.checked ? "" : "Votre accord est nécessaire pour traiter la demande."; }
  };

  function afficherErreur(champ, texte) {
    var conteneur = champ.closest(".champ, .case-bloc");
    var zone = document.getElementById(champ.id + "-erreur");
    if (conteneur) conteneur.classList.toggle("champ--erreur", !!texte);
    champ.setAttribute("aria-invalid", texte ? "true" : "false");
    if (zone) { zone.textContent = texte; zone.hidden = !texte; }
  }

  function controler(champ) {
    var regle = regles[champ.name];
    if (!regle) return "";
    var erreur = regle(champ.value.trim(), champ);
    afficherErreur(champ, erreur);
    return erreur;
  }

  function annoncer(type, html) {
    retour.className = "message message--" + type;
    retour.innerHTML = html;
    retour.hidden = false;
    retour.focus();
  }

  // Sujets consultés sur le site : ajoutés au message uniquement si le visiteur a coché
  // la case prévue (elle n'apparaît que s'il a accepté la personnalisation — preferences.js).
  function messageComplet() {
    var message = (formulaire.querySelector("[name=message]").value || "").trim();
    var caseJoindre = formulaire.querySelector("[data-interets-joints]");
    var complement = caseJoindre && caseJoindre.checked ? caseJoindre.getAttribute("data-texte") || "" : "";
    return complement && message.length + complement.length + 4 <= 2000 ? message + "\n\n— " + complement : message;
  }

  function lienCourriel() {
    var d = new FormData(formulaire);
    var sujet = formulaire.querySelector("[name=sujet]");
    var libelle = sujet.options[sujet.selectedIndex] ? sujet.options[sujet.selectedIndex].text : "Demande";
    var corps = [
      "Nom : " + (d.get("nom") || ""),
      "Téléphone : " + (d.get("telephone") || ""),
      d.get("email") ? "E-mail : " + d.get("email") : "",
      d.get("localite") ? "Localité : " + d.get("localite") : "",
      "",
      messageComplet()
    ].filter(function (l, i) { return l !== "" || i === 4; }).join("\n");
    return "mailto:" + courriel + "?subject=" + encodeURIComponent("Demande depuis le site — " + libelle) + "&body=" + encodeURIComponent(corps);
  }

  function solutionDeSecours() {
    annoncer("erreur",
      "<span><strong>L'envoi en ligne est momentanément indisponible.</strong> Votre message n'a pas été transmis. " +
      "Vous pouvez l'envoyer depuis votre messagerie ou nous appeler au <a class=\"lien-texte\" href=\"tel:" + telephone.replace(/[^\d+]/g, "") + "\">" + telephone + "</a>.<br>" +
      "<a class=\"btn btn--sombre btn--petit\" href=\"" + lienCourriel().replace(/"/g, "%22") + "\">Envoyer par e-mail</a></span>");
  }

  // Site ouvert depuis un dossier (adresse file://) : aucun service d'envoi n'est joignable.
  // On le dit clairement, sans jamais laisser croire que le message est parti.
  function horsLigne() {
    annoncer("info",
      "<span><strong>Aperçu hors ligne : votre message n'a pas été transmis.</strong> Le site est ouvert depuis un dossier de votre ordinateur ; l'envoi direct ne fonctionne que sur le site en ligne. " +
      "Vous pouvez envoyer ce message depuis votre messagerie ou appeler le <a class=\"lien-texte\" href=\"tel:" + telephone.replace(/[^\d+]/g, "") + "\">" + telephone + "</a>.<br>" +
      "<a class=\"btn btn--sombre btn--petit\" href=\"" + lienCourriel().replace(/"/g, "%22") + "\">Envoyer par e-mail</a></span>");
  }

  formulaire.querySelectorAll("input, select, textarea").forEach(function (champ) {
    champ.addEventListener("blur", function () { if (champ.value || champ.getAttribute("aria-invalid") === "true") controler(champ); });
    champ.addEventListener("change", function () { if (champ.getAttribute("aria-invalid") === "true") controler(champ); });
  });

  formulaire.addEventListener("submit", function (e) {
    e.preventDefault();
    retour.hidden = true;
    var premierFautif = null;
    Array.prototype.forEach.call(formulaire.elements, function (champ) {
      if (!champ.name || !regles[champ.name]) return;
      if (controler(champ) && !premierFautif) premierFautif = champ;
    });
    if (premierFautif) { premierFautif.focus(); return; }
    if (!/^https?:$/.test(window.location.protocol)) { horsLigne(); return; }

    var donnees = new URLSearchParams(new FormData(formulaire));
    donnees.set("message", messageComplet());
    donnees.set("duree", String(Math.round((Date.now() - debut) / 1000)));
    bouton.disabled = true;
    bouton.textContent = "Envoi en cours…";

    fetch(formulaire.action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json", "X-Requested-With": "fetch" },
      body: donnees.toString()
    })
      .then(function (reponse) {
        return reponse.json().then(function (json) { return { statut: reponse.status, json: json }; });
      })
      .then(function (r) {
        if (r.json && r.json.ok) {
          formulaire.reset();
          debut = Date.now();
          annoncer("succes", r.json.apercu
            ? "<span><strong>Mode aperçu.</strong> Votre demande est valide et a été enregistrée sur ce poste, mais elle n'a pas été transmise à U-IMCEC : le service d'envoi n'est actif que sur le site en ligne.</span>"
            : "<span><strong>Merci, votre demande a bien été envoyée.</strong> Un conseiller U-IMCEC vous recontactera au numéro indiqué.</span>");
        } else if (r.statut === 422 && r.json && r.json.erreurs) {
          var premier = null;
          Object.keys(r.json.erreurs).forEach(function (nom) {
            if (!/^[a-z_]+$/.test(nom)) return;
            var champ = formulaire.querySelector("[name=" + nom + "]");
            if (champ) { afficherErreur(champ, r.json.erreurs[nom]); if (!premier) premier = champ; }
          });
          if (premier) premier.focus();
        } else if (r.statut === 429) {
          annoncer("erreur", "<span><strong>Trop de demandes envoyées.</strong> Merci de patienter quelques minutes avant de réessayer.</span>");
        } else {
          solutionDeSecours();
        }
      })
      .catch(solutionDeSecours)
      .then(function () { bouton.disabled = false; bouton.innerHTML = libelleBouton; });
  });
})();
