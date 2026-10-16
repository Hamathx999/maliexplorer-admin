import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = join(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Des exemples de points de terminaison d'API REST Express peuvent être définis ici.
 * Décommentez et définissez les points de terminaison selon les besoins.
 *
 * Exemple :
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Traiter la requête API
 * });
 * ```
 */

/**
 * Servir les fichiers statiques depuis le dossier /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Gérer toutes les autres requêtes en effectuant le rendu de l'application Angular.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Démarre le serveur si ce module est le point d'entrée principal, ou s'il est exécuté via PM2.
 * Le serveur écoute sur le port défini par la variable d'environnement `PORT`, ou par défaut 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Gestionnaire de requêtes utilisé par le CLI Angular (pour le serveur de développement et lors du build) ou Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
