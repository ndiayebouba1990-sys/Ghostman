<?php
/**
 * Réglages du formulaire de contact — À ADAPTER AVANT LA MISE EN LIGNE.
 * Ce fichier n'est pas accessible depuis le navigateur (voir api/.htaccess).
 */

return [
    // Boîte qui reçoit les demandes.
    'destinataire' => 'uimcec@uimcec.sn',

    // Adresse d'expédition : elle doit appartenir au domaine du site
    // (sinon les messages risquent d'être classés en indésirables).
    'expediteur' => 'ne-pas-repondre@uimcec.sn',

    // Domaines autorisés à utiliser le formulaire.
    'domaines_autorises' => ['www.uimcec.sn', 'uimcec.sn'],

    // Chaîne aléatoire servant à anonymiser les adresses IP (limitation de débit).
    // À remplacer par une valeur propre à votre installation.
    'sel' => 'remplacer-par-une-longue-chaine-aleatoire',
];
