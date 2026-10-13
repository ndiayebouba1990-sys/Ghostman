<?php
/**
 * U-IMCEC — traitement du formulaire de contact.
 *
 * Règles identiques à celles du serveur d'aperçu (tools/serveur-apercu.mjs) :
 *   validation côté serveur · champ piège · limitation de débit · contrôle d'origine
 *   · masquage des suites de 13 à 19 chiffres (numéro de carte saisi par erreur)
 *   · protection contre l'injection d'en-têtes e-mail.
 *
 * Réglages : api/config.php (adresse de réception, domaine autorisé).
 * Ce script n'a pas pu être exécuté dans l'environnement de développement (PHP absent) :
 * il doit être testé sur l'hébergement avant la mise en ligne (voir README).
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

const SUJETS = [
    'epargne'     => 'Épargne',
    'credit'      => 'Crédit ou financement d\'un projet',
    'agricole'    => 'Financement agricole',
    'numerique'   => 'Services numériques',
    'compte'      => 'Ouvrir un compte / devenir membre',
    'agence'      => 'Trouver une agence ou un guichet',
    'reclamation' => 'Réclamation',
    'autre'       => 'Autre demande',
];

$attendJson = (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') === 'fetch')
    || str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function repondre(int $statut, array $corps, bool $json): void
{
    http_response_code($statut);
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    if ($json) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($corps, JSON_UNESCAPED_UNICODE);
        exit;
    }
    // Navigateur sans JavaScript : page de réponse minimale.
    header('Content-Type: text/html; charset=utf-8');
    $titre = !empty($corps['ok']) ? 'Votre demande a bien été envoyée' : 'Votre demande n\'a pas pu être envoyée';
    $texte = htmlspecialchars($corps['message'] ?? '', ENT_QUOTES, 'UTF-8');
    if (!empty($corps['erreurs'])) {
        $texte .= '<ul><li>' . implode('</li><li>', array_map(
            static fn ($e) => htmlspecialchars($e, ENT_QUOTES, 'UTF-8'),
            $corps['erreurs']
        )) . '</li></ul>';
    }
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>' . $titre . ' — U-IMCEC</title><link rel="stylesheet" href="../assets/css/site.css"></head>'
        . '<body><main class="page-erreur"><div class="conteneur conteneur--etroit"><h1>' . $titre . '</h1><div class="chapo">' . $texte . '</div>'
        . '<p class="actions"><a class="btn btn--primaire" href="../contact.html">Retour au formulaire</a> <a class="btn btn--contour" href="../index.html">Accueil</a></p></div></main></body></html>';
    exit;
}

function nettoyer(string $cle): string
{
    $valeur = $_POST[$cle] ?? '';
    if (!is_string($valeur)) {
        return '';
    }
    // Retire les caractères de contrôle (sauf saut de ligne et tabulation).
    return trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $valeur) ?? '');
}

function uneLigne(string $valeur): string
{
    // Aucun saut de ligne dans ce qui part dans un en-tête d'e-mail.
    return trim(preg_replace('/[\r\n]+/', ' ', $valeur) ?? '');
}

// ——— 1. Méthode et origine ———
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    repondre(405, ['ok' => false, 'message' => 'Méthode non autorisée.'], $attendJson);
}

$origine = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origine !== '') {
    $hote = parse_url($origine, PHP_URL_HOST) ?: '';
    if (!in_array(strtolower($hote), array_map('strtolower', $config['domaines_autorises']), true)) {
        repondre(403, ['ok' => false, 'message' => 'Origine non autorisée.'], $attendJson);
    }
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) {
    repondre(413, ['ok' => false, 'message' => 'Demande trop volumineuse.'], $attendJson);
}

// ——— 2. Limitation de débit : 5 envois par 10 minutes et par adresse IP ———
$dossier = __DIR__ . '/donnees';
if (!is_dir($dossier)) {
    @mkdir($dossier, 0700, true);
}
$ip = $_SERVER['REMOTE_ADDR'] ?? 'inconnue';
$fichierDebit = $dossier . '/debit-' . hash('sha256', $ip . $config['sel']) . '.json';
$maintenant = time();
$envois = [];
if (is_file($fichierDebit)) {
    $envois = json_decode((string) file_get_contents($fichierDebit), true) ?: [];
}
$envois = array_values(array_filter($envois, static fn ($t) => is_int($t) && $maintenant - $t < 600));
$envois[] = $maintenant;
@file_put_contents($fichierDebit, json_encode($envois), LOCK_EX);
if (count($envois) > 5) {
    repondre(429, ['ok' => false, 'message' => 'Trop de demandes. Réessayez dans quelques minutes.'], $attendJson);
}

// ——— 3. Champ piège : réponse neutre pour les robots ———
if (nettoyer('site_web') !== '') {
    repondre(200, ['ok' => true], $attendJson);
}

// ——— 4. Validation ———
$nom       = nettoyer('nom');
$telephone = nettoyer('telephone');
$email     = nettoyer('email');
$sujet     = nettoyer('sujet');
$localite  = nettoyer('localite');
$message   = nettoyer('message');
$erreurs   = [];

if (mb_strlen($nom) < 2 || mb_strlen($nom) > 80) {
    $erreurs['nom'] = 'Indiquez votre nom (2 à 80 caractères).';
}
if (!preg_match('/^[+\d][\d\s().-]{6,19}$/', $telephone)) {
    $erreurs['telephone'] = 'Indiquez un numéro de téléphone valide.';
}
if ($email !== '' && (mb_strlen($email) > 120 || filter_var($email, FILTER_VALIDATE_EMAIL) === false)) {
    $erreurs['email'] = 'L\'adresse e-mail n\'est pas valide.';
}
if (!array_key_exists($sujet, SUJETS)) {
    $erreurs['sujet'] = 'Choisissez l\'objet de votre demande.';
}
if (mb_strlen($localite) > 80) {
    $erreurs['localite'] = 'Localité trop longue (80 caractères maximum).';
}
if (mb_strlen($message) < 10 || mb_strlen($message) > 2000) {
    $erreurs['message'] = 'Votre message doit contenir entre 10 et 2000 caractères.';
}
if (nettoyer('consentement') !== 'oui') {
    $erreurs['consentement'] = 'Votre accord est nécessaire pour traiter la demande.';
}
if ($erreurs) {
    repondre(422, ['ok' => false, 'erreurs' => $erreurs, 'message' => 'Certains champs sont à corriger.'], $attendJson);
}

// Masque toute suite de 13 à 19 chiffres (numéro de carte saisi par erreur).
$message = preg_replace('/(?:\d[ -]?){13,19}/', '[numéro masqué] ', $message) ?? $message;

// ——— 5. Envoi de l'e-mail ———
$objet = 'Site web — ' . SUJETS[$sujet] . ' — ' . uneLigne($nom);
$corps = "Nouvelle demande reçue depuis le site internet\n"
    . "----------------------------------------------\n"
    . 'Objet      : ' . SUJETS[$sujet] . "\n"
    . 'Nom        : ' . uneLigne($nom) . "\n"
    . 'Téléphone  : ' . uneLigne($telephone) . "\n"
    . 'E-mail     : ' . ($email !== '' ? uneLigne($email) : 'non renseigné') . "\n"
    . 'Localité   : ' . ($localite !== '' ? uneLigne($localite) : 'non renseignée') . "\n"
    . 'Date       : ' . date('d/m/Y H:i') . "\n\n"
    . "Message :\n" . $message . "\n\n"
    . "--\nLe visiteur a donné son accord pour l'utilisation de ces informations afin de traiter sa demande.\n";

$entetes = [
    'From: ' . mb_encode_mimeheader('Site U-IMCEC', 'UTF-8') . ' <' . $config['expediteur'] . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: site-uimcec',
];
if ($email !== '') {
    $entetes[] = 'Reply-To: ' . uneLigne($email);
}

$objetCode = mb_encode_mimeheader($objet, 'UTF-8');
$entetesTexte = implode("
", $entetes);
$envoye = @mail($config['destinataire'], $objetCode, $corps, $entetesTexte, '-f' . $config['expediteur']);
if (!$envoye) {
    // Certains hébergeurs refusent le paramètre -f : second essai sans lui.
    $envoye = @mail($config['destinataire'], $objetCode, $corps, $entetesTexte);
}

if (!$envoye) {
    error_log('[contact U-IMCEC] échec de l\'envoi du message.');
    repondre(502, ['ok' => false, 'message' => 'Le message n\'a pas pu être envoyé. Merci de nous appeler ou de nous écrire directement.'], $attendJson);
}

repondre(200, ['ok' => true, 'message' => 'Merci, votre demande a bien été envoyée. Un conseiller U-IMCEC vous recontactera.'], $attendJson);
