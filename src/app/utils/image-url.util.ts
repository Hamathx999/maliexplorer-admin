/**
 * Utilitaires de normalisation et de sécurisation des URLs d'images.
 *
 * Corrige notamment le problème critique d'erreur HTTP 431 (Request Header Fields Too Large)
 * sur le serveur de développement Vite (localhost:4200) :
 * - Lorsqu'une data-URI (`data:image/jpeg;base64,/9j/4AAQ...`) était découpée avec `.split(',')`,
 *   la seconde partie (`/9j/4AAQ...`, 50+ Ko) était interprétée par le navigateur comme une URL
 *   relative `GET http://localhost:4200/9j/4AAQ...`, dépassant la limite d'en-tête HTTP de Node.js (16 Ko).
 */

/**
 * Découpe une chaîne d'URLs d'images séparées par des virgules SANS jamais couper
 * à l'intérieur d'une data-URI (`data:image/...;base64,...`).
 */
export function splitImageUrls(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Si c'est une unique data-URI, ne surtout pas faire split(',')
  if (trimmed.startsWith('data:image/')) {
    const restored = sanitizeImageUrl(trimmed);
    return restored ? [restored] : [];
  }

  // Découper uniquement sur les virgules suivies d'une vraie URL (http://, https://, /assets/, data:image/)
  const parts = trimmed
    .split(/,(?=\s*(?:https?:\/\/|\/assets\/|assets\/|data:image\/))/i)
    .map((p) => sanitizeImageUrl(p))
    .filter((p): p is string => Boolean(p));

  return parts;
}

/**
 * Normalise une URL d'image et répare les chaînes Base64 tronquées qui provoqueraient
 * une requête HTTP relative géante (erreur 431) vers localhost:4200.
 */
export function sanitizeImageUrl(url: string | null | undefined, fallback: string = ''): string {
  if (!url || typeof url !== 'string') return fallback;
  const s = url.trim();
  if (!s) return fallback;

  // Fragment orphelin issu d'un ancien split(',') sur "data:image/jpeg;base64,/9j/..."
  if (/^data:image\/[a-zA-Z0-9+.-]+;base64$/i.test(s)) {
    return fallback;
  }

  // Chaîne Base64 JPEG brute commençant par "/9j/" (sans préfixe data:image/jpeg;base64,)
  if (s.startsWith('/9j/') || s.startsWith('9j/')) {
    const cleanBase64 = s.startsWith('/') ? s : `/${s}`;
    return `data:image/jpeg;base64,${cleanBase64}`;
  }

  // Chaîne Base64 PNG brute commençant par "iVBOR"
  if (s.startsWith('iVBOR') || s.startsWith('/iVBOR')) {
    const cleanBase64 = s.startsWith('/') ? s.slice(1) : s;
    return `data:image/png;base64,${cleanBase64}`;
  }

  // Chaîne trop longue (> 2048 caractères) qui n'est pas préfixée par "data:" :
  // empêcher absolument le navigateur d'envoyer une requête GET de plusieurs dizaines de Ko au serveur Vite
  if (s.length > 2048 && !s.startsWith('data:')) {
    return fallback;
  }

  return s;
}

