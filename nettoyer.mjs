// Vide le dossier de construction (_atelier/_site/) avant chaque construction, pour qu'une
// page supprimée ou renommée ne reste pas publiée par erreur.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SORTIE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
fs.rmSync(SORTIE, { recursive: true, force: true });
