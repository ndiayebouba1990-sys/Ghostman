// U-IMCEC — comportements communs à toutes les pages (aucune dépendance).
(function () {
  "use strict";

  var mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ——— En-tête : ombre une fois la page défilée ——— */
  var entete = document.querySelector("[data-entete]");
  var retourHaut = document.querySelector("[data-retour-haut]");
  function surDefilement() {
    var y = window.scrollY;
    if (entete) entete.classList.toggle("est-collee", y > 8);
    if (retourHaut) retourHaut.classList.toggle("est-visible", y > 700);
  }
  window.addEventListener("scroll", surDefilement, { passive: true });
  surDefilement();
  if (retourHaut) {
    retourHaut.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: mouvementReduit ? "auto" : "smooth" });
      var contenu = document.getElementById("contenu");
      if (contenu) contenu.focus({ preventScroll: true });
    });
  }

  /* ——— Panneau « Solutions » (bureau) ——— */
  var boutonPanneau = document.querySelector("[data-panneau]");
  if (boutonPanneau) {
    var panneau = document.getElementById(boutonPanneau.getAttribute("aria-controls"));
    var item = boutonPanneau.closest("li");
    var minuterie;
    var ouvrirPanneau = function (ouvert) {
      boutonPanneau.setAttribute("aria-expanded", String(ouvert));
      panneau.classList.toggle("est-ouvert", ouvert);
    };
    boutonPanneau.addEventListener("click", function () {
      ouvrirPanneau(boutonPanneau.getAttribute("aria-expanded") !== "true");
    });
    // Ouverture au survol (souris uniquement), avec un léger délai de fermeture.
    item.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { clearTimeout(minuterie); ouvrirPanneau(true); } });
    item.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { minuterie = setTimeout(function () { ouvrirPanneau(false); }, 180); } });
    document.addEventListener("click", function (e) { if (!item.contains(e.target)) ouvrirPanneau(false); });
    item.addEventListener("focusout", function (e) { if (e.relatedTarget && !item.contains(e.relatedTarget)) ouvrirPanneau(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && boutonPanneau.getAttribute("aria-expanded") === "true") { ouvrirPanneau(false); boutonPanneau.focus(); }
    });
  }

  /* ——— Tiroir de navigation (mobile) ——— */
  var bascule = document.querySelector("[data-bascule-menu]");
  var tiroir = document.querySelector("[data-tiroir]");
  if (bascule && tiroir) {
    var focalisables = function () {
      return Array.prototype.slice.call(tiroir.querySelectorAll("a[href], button:not([disabled])")).filter(function (el) { return el.offsetParent !== null; });
    };
    var ouvrirTiroir = function (ouvert) {
      bascule.setAttribute("aria-expanded", String(ouvert));
      bascule.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
      document.body.classList.toggle("menu-ouvert", ouvert);
      if (ouvert) {
        // Le tiroir se place exactement sous l'en-tête, où qu'il soit dans la fenêtre.
        tiroir.style.top = Math.max(0, Math.round(entete.getBoundingClientRect().bottom)) + "px";
        tiroir.hidden = false;
        // Laisse le navigateur prendre en compte « hidden » avant la transition.
        requestAnimationFrame(function () { tiroir.classList.add("est-ouvert"); });
      } else {
        tiroir.classList.remove("est-ouvert");
        setTimeout(function () { if (bascule.getAttribute("aria-expanded") !== "true") tiroir.hidden = true; }, mouvementReduit ? 0 : 300);
      }
    };
    bascule.addEventListener("click", function () { ouvrirTiroir(bascule.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (bascule.getAttribute("aria-expanded") !== "true") return;
      if (e.key === "Escape") { ouvrirTiroir(false); bascule.focus(); return; }
      if (e.key !== "Tab") return;
      // Le focus reste entre le bouton de fermeture et les liens du tiroir.
      var els = [bascule].concat(focalisables());
      var premier = els[0], dernier = els[els.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    });
    window.matchMedia("(min-width: 1100px)").addEventListener("change", function (e) { if (e.matches) ouvrirTiroir(false); });
    tiroir.querySelectorAll("[data-accordeon]").forEach(function (bouton) {
      var cible = document.getElementById(bouton.getAttribute("aria-controls"));
      bouton.addEventListener("click", function () {
        var ouvert = bouton.getAttribute("aria-expanded") !== "true";
        bouton.setAttribute("aria-expanded", String(ouvert));
        cible.hidden = !ouvert;
      });
    });
  }

  /* ——— Bannière : carrousel accessible (onglets libellés, pause, balayage tactile) ——— */
  var hero = document.querySelector("[data-hero]");
  if (hero) {
    var diapos = Array.prototype.slice.call(hero.querySelectorAll("[data-diapo]"));
    var fonds = Array.prototype.slice.call(hero.querySelectorAll("[data-fond]"));
    var onglets = Array.prototype.slice.call(hero.querySelectorAll("[data-onglet]"));
    var boutonPause = hero.querySelector("[data-pause]");
    var zoneVivante = hero.querySelector("[data-diapos]");
    var courant = 0;

    var montrer = function (i) {
      courant = (i + diapos.length) % diapos.length;
      diapos.forEach(function (d, n) { d.classList.toggle("est-active", n === courant); });
      fonds.forEach(function (f, n) { f.classList.toggle("est-active", n === courant); });
      onglets.forEach(function (o, n) {
        if (n === courant) o.setAttribute("aria-current", "true"); else o.removeAttribute("aria-current");
      });
    };
    var mettreEnPause = function (pause) {
      hero.classList.toggle("en-pause", pause);
      if (boutonPause) boutonPause.setAttribute("aria-label", pause ? "Reprendre le défilement des diapositives" : "Mettre le défilement en pause");
      if (zoneVivante) zoneVivante.setAttribute("aria-live", pause ? "polite" : "off");
    };

    onglets.forEach(function (o, n) {
      o.addEventListener("click", function () { montrer(n); });
      // La fin de la barre de progression (animation CSS) déclenche la diapositive suivante.
      o.addEventListener("animationend", function (e) { if (e.animationName === "progression") montrer(courant + 1); });
    });
    if (boutonPause) boutonPause.addEventListener("click", function () { mettreEnPause(!hero.classList.contains("en-pause")); });

    if (diapos.length > 1 && !mouvementReduit) hero.classList.add("defile");
    else { mettreEnPause(true); if (boutonPause) boutonPause.hidden = true; }

    // Pendant la lecture au clavier ou au lecteur d'écran, on fige le défilement.
    hero.addEventListener("focusin", function (e) { if (e.target.closest("[data-diapo]")) mettreEnPause(true); });

    var departX = null;
    hero.addEventListener("touchstart", function (e) { departX = e.changedTouches[0].clientX; }, { passive: true });
    hero.addEventListener("touchend", function (e) {
      if (departX === null) return;
      var dx = e.changedTouches[0].clientX - departX;
      if (Math.abs(dx) > 60) montrer(courant + (dx < 0 ? 1 : -1));
      departX = null;
    }, { passive: true });
  }

  /* ——— Apparition douce des blocs sous la ligne de flottaison ——— */
  var aReveler = document.querySelectorAll(".revele");
  if (aReveler.length && "IntersectionObserver" in window && !mouvementReduit) {
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) { entree.target.classList.remove("revele--attente"); observateur.unobserve(entree.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    aReveler.forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) { el.classList.add("revele--attente"); observateur.observe(el); }
    });
  }
})();
