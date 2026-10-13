# Site institutionnel U-IMCEC Sénégal — refonte

Projet complet de refonte du site `uimcec.sn` : page d'accueil, pages de solutions, services numériques, présentation de l'institution, recherche d'agence, actualités administrables, formulaire de contact sécurisé, cookies de préférences, pages légales.

> **État : version de travail.** Le site est fonctionnel, mais plusieurs contenus doivent être validés ou complétés par U-IMCEC avant la mise en ligne. Tant que `prepublication` vaut `true` dans `src/_data/site.json`, un bandeau l'indique, les éléments à confirmer sont signalés en jaune et l'indexation par les moteurs de recherche est bloquée. Voir la [liste de contrôle](#7-liste-de-contrôle-avant-la-mise-en-ligne).

Documents associés : [docs/AUDIT-ET-SOURCES.md](docs/AUDIT-ET-SOURCES.md) (analyse des deux sites, couleurs relevées, sources de chaque information, crédits des images).

---

## 1. Voir le site

**Le plus simple :** dans le dossier parent, double-cliquez sur `index.html`. Aucun serveur, aucune installation.

Le dossier parent contient le site prêt à publier ; ce dossier `_atelier` contient ce qui sert à le fabriquer.

```
Site UIMCEC/
├── index.html, credit.html, agences.html…   ← le site (32 pages .html)
├── assets/                                    feuille de style, scripts, polices, images
├── api/, admin/, .htaccess                    utiles une fois le site en ligne
├── LISEZ-MOI.txt
└── _atelier/                                ← vous êtes ici : sources et outils (à ne pas publier)
```

**Après une modification :** double-cliquez sur `construire.bat`. Il reconstruit le site, le contrôle, puis le recopie dans le dossier parent. Node.js doit être installé (<https://nodejs.org>, version 18 ou plus récente).

| Commande | Rôle |
| --- | --- |
| `npm run tout` | Construit, contrôle et publie dans le dossier parent (ce que fait `construire.bat`) |
| `npm run build` | Construit le site dans `_site/` |
| `npm run verifier` | Contrôle liens, images, SEO, accessibilité et adresses relatives de `_site/` |
| `npm run publier` | Recopie `_site/` dans le dossier parent |
| `npm run apercu` | Sert `_site/` sur <http://localhost:8080>, « comme en ligne » : vrais cookies, formulaire simulé (`apercu.bat`) |
| `npm run dev` | Aperçu avec rechargement automatique pendant qu'on modifie |
| `npm run admin` | Lance l'interface d'administration en local (voir § 3) |
| `npm run images` | Optimise les photos de `media/originaux/` |

## 2. Organisation du projet

```
_atelier/
├── src/                      ← tout ce qui se modifie
│   ├── _data/                ← contenus structurés (JSON)
│   │   ├── site.json         coordonnées, réseaux sociaux, mode « version de travail »
│   │   ├── accueil.json      bannière, accès rapides, mission, engagements
│   │   ├── chiffres.json     chiffres clés, avec leur source
│   │   ├── agences.json      caisses, agences, guichets
│   │   ├── numerique.json    services numériques
│   │   ├── navigation.json   menus
│   │   ├── preferences.json  cookies : textes du bandeau, centres d'intérêt, liste des cookies
│   │   ├── redirections.json pages-relais des adresses de l'ancien site
│   │   └── images.json       (généré par « npm run images » — ne pas modifier à la main)
│   ├── actualites/*.md       un fichier par actualité
│   ├── solutions/*.md        un fichier par solution (épargne, crédit…)
│   ├── agences/              page de recherche + fiche de chaque caisse
│   ├── cookies.njk           page « Cookies et préférences »
│   ├── _includes/            gabarits (mise en page, en-tête, pied de page, composants)
│   │   └── css/              système de design, en 7 fichiers commentés
│   ├── assets/               polices, scripts, images optimisées
│   ├── static/               fichiers copiés tels quels (.htaccess, api/contact.php, icônes)
│   └── admin/                interface d'administration (Decap CMS)
├── media/                    photos d'origine + crédits (sources.json) — non publié
├── tools/                    scripts : construction, contrôle, publication, images, aperçu
├── docs/                     audit, sources, crédits
└── _site/                    le site construit (recopié ensuite dans le dossier parent)
```

**Technologie.** Le site actuel est un gabarit HTML statique (Bootstrap + jQuery). La refonte reste statique — donc rapide, peu coûteuse à héberger et sans base de données à sécuriser — mais elle est produite par le générateur [Eleventy](https://www.11ty.dev) : les contenus sont séparés de la mise en page et modifiables sans toucher au code. Aucune bibliothèque n'est chargée dans le navigateur du visiteur : HTML, une feuille de style, quatre petits scripts.

### Pages en `.html` et liens relatifs

Chaque page est un fichier `.html` posé à la racine du site (`credit.html`, `agences.html`, `actualite-….html`), et tous les liens internes sont **relatifs**. Conséquence : le même dossier fonctionne ouvert d'un double-clic, déposé à la racine d'un hébergement, ou déposé dans un sous-dossier.

Dans les gabarits et les contenus, on écrit les liens **avec une barre initiale** : `/contact.html`, `/assets/img/…`, `/agences.html?region=Thiès`. La construction retire cette barre (transformation « adresses-relatives » de `eleventy.config.js`), et `npm run verifier` refuse toute adresse qui en aurait gardé une. L'adresse d'une page se règle par le champ `permalink` en tête de son fichier.

Trois pages de l'ancien site ont gardé leur nom (`contact.html`, `epargne.html`, `credit.html`) : les liens existants continuent de fonctionner.

## 3. Modifier les contenus

### Avec l'interface d'administration (recommandé)

1. Dans un premier terminal : `npm run dev`
2. Dans un second terminal : `npm run admin`
3. Ouvrez <http://localhost:8080/admin/> et cliquez sur « Se connecter » (aucun mot de passe en local).

Vous pouvez alors modifier : les **actualités**, les **solutions**, et dans « Réglages et données » les **coordonnées**, les **agences**, les **chiffres clés**, la **page d'accueil** et les **services numériques**. Chaque enregistrement modifie le fichier correspondant dans `src/` ; lancez ensuite `construire.bat` pour produire le site à publier.

Pour administrer le site **en ligne**, sans poste technique, il faut héberger le projet dans un dépôt Git (GitHub ou GitLab) et relier Decap CMS à ce dépôt : voir § 6, option B.

### Directement dans les fichiers

- **Ajouter une actualité** : dupliquez un fichier de `src/actualites/`, nommez-le `AAAA-MM-JJ-titre-court.md`, modifiez l'en-tête (titre, date, rubrique, résumé) et le texte. Les quatre plus récentes apparaissent sur l'accueil. La page créée s'appelle `actualite-titre-court.html`.
- **Ajouter une agence** : ajoutez un bloc dans `src/_data/agences.json`. Un point marqué `"verifie": false` n'apparaît que dans la version de travail.
- **Corriger un chiffre clé** : `src/_data/chiffres.json`. Un chiffre marqué `"confirme": false` n'est pas publié.

### Règles éditoriales à conserver

- Ne publiez **aucun taux, tarif, durée ou condition** qui ne soit validé par U-IMCEC.
- Indiquez toujours la **source et la date** d'un chiffre.
- Pas de témoignage sans l'accord écrit de la personne ; pas de photo de client sans son autorisation.
- Une actualité tirée d'une publication externe doit citer sa source (champs « Source » de l'article).

## 4. Images

1. Déposez la photo d'origine (JPEG ou PNG, 1 920 px de large ou plus) dans `media/originaux/`.
2. Ajoutez son crédit dans `media/sources.json` (titre, auteur, licence, lien de la source, date, nature `officiel` ou `illustration`).
3. Lancez `npm run images` : la photo est déclinée en WebP (480, 800, 1 200, 1 920 px) avec un JPEG de repli, et devient utilisable par son nom (ex. `marche-lompoul`).

Le crédit s'affiche automatiquement sur l'image et sur la page `credits-photos.html`. Une image `illustration` est accompagnée d'une mention précisant qu'elle ne représente pas U-IMCEC.

**Logo.** Le logo utilisé provient de l'icône officielle de l'application UIMCEC Mobile (512 px). Il est net aux tailles affichées, mais il faut le remplacer par le fichier d'origine de U-IMCEC (idéalement vectoriel) : `src/assets/img/logo-uimcec-96.png`, `-192.png`, `-192.webp` et les icônes de `src/static/`.

## 5. Identité visuelle

Toutes les couleurs sont des variables définies dans `src/_includes/css/01-jetons.css`. Les quatre couleurs de marque ont été **mesurées** sur les supports officiels (détail dans l'audit) :

| Variable | Valeur | Origine |
| --- | --- | --- |
| `--orange` | `#ff880e` | Site officiel (boutons, soulignés) |
| `--orange-fonce` | `#d66c0b` | Site officiel (survols, filets) |
| `--terre` | `#e48753` | Orange du logo et de l'application mobile |
| `--brun` | `#5b4339` | Brun du logo et de l'application mobile |

Les autres teintes (fonds sable, brun profond, textes) en sont dérivées. Le motif récurrent — demi-disque, arches, cercles — reprend le demi-disque orange du logo. Polices : Bricolage Grotesque (titres) et Figtree (texte), sous licence libre OFL, hébergées sur le site.

> Le logo comporte un orange et un **brun**, non un bordeaux : la palette suit le logo (mesure refaite le 13 octobre 2026 sur le fichier du logo : brun `#5c443c`, orange `#e48c5c`). Si la charte officielle prévoit un bordeaux, il suffit de modifier `--brun` et ses déclinaisons.

## 6. Mise en ligne

### Option A — Hébergement actuel (Apache + PHP)

1. Passez `prepublication` à `false` dans `src/_data/site.json` **une fois la liste de contrôle terminée**, puis lancez `construire.bat`.
2. Déposez **le contenu du dossier parent** à la racine du site (FTP/SFTP), fichier `.htaccess` compris — **sans** le dossier `_atelier` ni `LISEZ-MOI.txt`.
3. Formulaire : ouvrez `api/config.php` sur le serveur, renseignez l'adresse de réception, une adresse d'expédition du domaine et remplacez la valeur `sel`. PHP 8.0 ou plus récent est nécessaire. Envoyez un message de test.
4. HTTPS : une fois le certificat actif, décommentez dans `.htaccess` la redirection HTTPS et l'en-tête `Strict-Transport-Security`.

Le fichier `.htaccess` fourni gère : les **redirections des anciennes adresses** (une quarantaine : `services.html`, `new.html`, `cfa.html`…), les en-têtes de sécurité (dont une politique de contenu stricte), le cache et la compression. Pour les hébergements sans `.htaccess`, trois pages-relais (`services.html`, `new.html`, `exchange.html`) redirigent les adresses du menu de l'ancien site.

### Option B — Hébergement avec administration en ligne

Placez le projet dans un dépôt Git et reliez-le à un service qui construit le site à chaque modification (Netlify, Cloudflare Pages, GitHub Pages…). Les liens étant relatifs, le site fonctionne aussi dans un sous-dossier, sans réglage. Dans `src/admin/config.yml`, adaptez la section `backend` ; l'équipe se connecte alors sur `/admin/` avec son compte. Le formulaire PHP n'étant pas disponible sur ces services, indiquez un autre point de traitement dans `site.json` → `formulaire.point_de_traitement`.

### Comptes d'administration

- Un compte nominatif par personne, jamais de compte partagé.
- Double authentification obligatoire sur le service Git.
- Droits d'écriture limités aux personnes qui publient ; retrait immédiat des accès à chaque départ.

## 7. Liste de contrôle avant la mise en ligne

Contenus à fournir ou à valider par U-IMCEC (ils sont signalés en jaune dans la version de travail) :

- [ ] **Logo** officiel en haute définition et charte graphique.
- [ ] **Répertoire complet** des 19 agences et 53 guichets : adresse, téléphone, horaires (seuls le siège et les quatre caisses sont confirmés ; huit points proviennent d'un annuaire tiers).
- [ ] **Coordonnées des quatre caisses de base** et horaires de la direction générale.
- [ ] **Catalogue des produits** : épargne, crédit, assurances, conditions, pièces à fournir.
- [ ] **Services numériques** : cartes, Bank to Wallet, Agency Banking, disponibilité de l'application sur iPhone.
- [ ] **Nombre de membres** (avec sa date de référence) et confirmation des chiffres publiés.
- [ ] **Photographies officielles** (agences, équipes, événements) avec autorisations, pour remplacer les illustrations.
- [ ] **Témoignages** validés, si U-IMCEC souhaite en publier.
- [ ] Relecture des **actualités** et de la liste des **partenaires**.
- [ ] **Mentions légales** (directeur de la publication, hébergeur), **politique de confidentialité** (durée de conservation, formalités CDP) et page **Cookies** : relecture par un juriste.
- [ ] Test d'envoi du **formulaire** sur l'hébergement réel.
- [ ] Test des **redirections** du fichier `.htaccess` sur l'hébergement réel.
- [ ] Passage de `prepublication` à `false`, puis `construire.bat`.

## 8. Cookies et préférences

Le site adapte son affichage aux centres d'intérêt de chaque visiteur, **uniquement avec son accord**.

**Ce que voit le visiteur.** À la première visite, un bandeau propose « Accepter », « Refuser » ou « Personnaliser », les trois au même niveau. Le lien « Gérer mes cookies » du pied de page et la page `cookies.html` permettent de changer d'avis, de choisir ses sujets, de voir exactement ce qui est retenu et de tout effacer.

**Ce que le site retient, s'il accepte.** Les sujets des pages consultées et des accès rapides cliqués, les sujets qu'il coche lui-même, la région choisie dans la recherche d'agence, le nombre de visites. Jamais son nom, ses coordonnées ni le contenu de ses messages.

**Ce que le site en fait.**

- Accueil : l'accès rapide correspondant au sujet principal passe en premier avec le repère « Pour vous », et un bloc propose de reprendre là où il en était.
- Recherche d'agence : elle se rouvre sur la région retenue.
- Contact : l'objet le plus probable est proposé ; une case, jamais cochée d'avance, permet de joindre ses sujets à sa demande.

**Les deux cookies.**

| Nom | Catégorie | Durée |
| --- | --- | --- |
| `uimcec_consentement` | Nécessaire : retient le choix du visiteur | 6 mois |
| `uimcec_preferences` | Personnalisation : déposé seulement après accord | 6 mois |

Cookies propres au site, `SameSite=Lax`, `Secure` en HTTPS. Aucun cookie publicitaire, aucun service tiers. Si le navigateur signale un refus global du suivi (Global Privacy Control), le bandeau n'est pas affiché et rien n'est retenu.

**En ouverture directe (double-clic).** Les navigateurs refusent les cookies sur les adresses `file://`. Le script utilise alors le stockage local du navigateur, avec les mêmes règles et la même durée ; la page `cookies.html` l'indique au visiteur.

**Limite à connaître.** Ces cookies personnalisent le site pour chaque visiteur ; ils ne fournissent pas à U-IMCEC de statistiques d'ensemble. Pour savoir quels sujets intéressent le plus l'ensemble des visiteurs, il faudrait ajouter un outil de mesure d'audience (Matomo, par exemple), chargé seulement après accord, et l'autoriser dans la politique de contenu du fichier `.htaccess`.

**Où modifier.**

| Élément | Fichier |
| --- | --- |
| Textes du bandeau, liste des centres d'intérêt, durée, tableau des cookies | `src/_data/preferences.json` |
| Centre d'intérêt d'une page | champ `interet` en tête de la page (ex. `interet: credit`) |
| Centre d'intérêt d'un accès rapide de l'accueil | champ `interet` dans `src/_data/accueil.json` |
| Comportement | `src/assets/js/preferences.js` |
| Apparence | `src/_includes/css/07-preferences.css` |
| Bandeau | `src/_includes/partials/consentement.njk` |

## 9. Ce qui a été vérifié — et ce qui ne l'a pas été

**Vérifié le 13 octobre 2026**, sur le site publié dans le dossier parent, piloté dans Microsoft Edge 155 :

- Construction sans erreur ; `npm run verifier` : 33 pages (dont 3 pages-relais), 2 385 liens, aucun lien interne cassé, aucune adresse commençant par « / », une balise `<h1>` par page, titres et descriptions uniques, texte alternatif sur toutes les images, aucun style ni script en ligne.
- **Ouverture directe (`file://`)** : 29 pages mesurées à 9 largeurs (320, 360, 390, 414, 768, 1 024, 1 280, 1 366 et 1 920 px), soit 261 mesures : aucun défilement horizontal, aucune erreur de console, aucune image cassée, polices chargées ; sur téléphone, tous les boutons et champs font au moins 40 px de haut.
- **Cookies de préférences** : parcours complet rejoué deux fois, en ouverture directe (41 vérifications) et sur le serveur d'aperçu avec de vrais cookies (43 vérifications) : rien n'est enregistré avant le choix ; un refus n'enregistre aucune préférence ; l'accueil, la recherche d'agence et le formulaire s'adaptent après accord ; effacement et retrait de l'accord ; durée de 180 jours et attributs des cookies ; ouverture et fermeture du panneau au clavier.
- Formulaire : en ouverture directe, il annonce clairement que le message n'est pas parti et propose l'envoi par e-mail ; sur le serveur d'aperçu, contrôles dans le navigateur et côté serveur, sujets joints transmis quand la case est cochée.
- Interactions en ouverture directe : panneau « Solutions » et menu mobile (ouverture, sous-menu, fermeture par Échap), onglets et pause de la bannière, recherche d'agence (texte, sans accent, région, lien `?region=`, état « aucun résultat »), présélection de l'objet du formulaire (`?sujet=`), pages-relais des trois anciennes adresses, absence de sollicitation quand le navigateur signale Global Privacy Control.
- Sources relues ce jour : entretien du directeur général (SOS Faim, 2 juin 2026) et prêt Kampani (ImpactAlpha, 24 juin 2026).

**Non vérifié** :

- `api/contact.php` n'a pas pu être exécuté (PHP absent du poste de développement). Sa logique est identique à celle du serveur d'aperçu, qui a été testée ; **un test sur l'hébergement est indispensable**.
- Les règles du fichier `.htaccess` (redirections, en-têtes) n'ont pas été testées sur un serveur Apache.
- L'administration **en ligne** (connexion à un dépôt Git) n'est pas configurée.
- Aucun test sur de vrais téléphones, dans Firefox ou Safari, ni avec un lecteur d'écran ; aucune mesure Lighthouse. Dans Firefox, en ouverture directe, les préférences peuvent ne pas être conservées d'une page à l'autre (chaque fichier y est isolé) ; ce n'est pas le cas une fois le site en ligne.
- Le site officiel `uimcec.sn` ne répondait pas le 13 octobre 2026 (comme le 11) : ses contenus n'ont pas pu être relus à la source. La fiche Google Play de l'application n'a pas pu être relue ce jour.

## 10. Maintenance

- `npm audit` signale des alertes sur des outils de construction (`sharp` en particulier, figé en version 0.32 pour rester compatible avec Node 18.15). Ces outils ne sont pas publiés avec le site. Avec Node 20 ou plus récent, mettez-les à jour : `npm install --save-dev sharp@latest`.
- La version de Decap CMS est figée dans `src/admin/index.html`.
- Après toute modification : `construire.bat` (ou `npm run tout`).
