// Administration en local — « npm run admin » (dans un second terminal, à côté de « npm run dev »).
// Lance le service local de Decap CMS : l'interface http://localhost:8080/admin/ lit et écrit
// alors directement les fichiers du dossier src/, sans compte ni connexion Internet.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binaire = path.join(racine, "node_modules", "decap-server", "dist", "index.js");
const service = spawn(process.execPath, [binaire], { cwd: racine, stdio: "inherit", env: { ...process.env, PORT: "8081" } });
service.on("exit", (code) => process.exit(code ?? 0));
