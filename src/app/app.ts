import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HeaderComponent } from './components/header/header.component';
import { DialogModalComponent } from './components/dialog-modal/dialog-modal.component';
import { sanitizeImageUrl, splitImageUrls } from './utils/image-url.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent, DialogModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly router = inject(Router);
  protected readonly title = signal('MaliExplorer Admin');
  readonly isLoginPage = signal<boolean>(false);

  constructor() {
    this.cleanupOversizedBrowserState();
    this.checkIfLogin(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.checkIfLogin(event.urlAfterRedirects);
      });
  }

  private checkIfLogin(url: string): void {
    this.isLoginPage.set(url.includes('/login'));
  }

  /**
   * Prévention de l'erreur Vite "Server responded with status code 431 (Request Header Fields Too Large)" :
   * 1. Supprime les cookies volumineux accumulés sur localhost (l'authentification utilise localStorage et non les cookies).
   * 2. Répare dans localStorage les éventuelles URLs d'images Base64 qui auraient été découpées par erreur sur une virgule.
   */
  private cleanupOversizedBrowserState(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    try {
      // 1. Purge des cookies localhost si leur taille cumulée dépasse 4 Ko
      if (document.cookie && document.cookie.length > 4096) {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const eqPos = cookie.indexOf('=');
          const name = (eqPos > -1 ? cookie.substring(0, eqPos) : cookie).trim();
          if (name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        }
      }

      // 2. Nettoyage des caches localStorage d'images potentiellement tronqués
      const cacheKeys = [
        'maliexplorer_villes_custom',
        'maliexplorer_plats_custom',
        'maliexplorer_ethnies_custom'
      ];
      for (const key of cacheKeys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          let modified = false;
          for (const item of parsed) {
            if (item && typeof item.imageUrl === 'string') {
              const clean = sanitizeImageUrl(item.imageUrl);
              if (clean !== item.imageUrl) {
                item.imageUrl = clean;
                modified = true;
              }
            }
            if (item && Array.isArray(item.images)) {
              const cleanedImages = item.images
                .map((u: string) => sanitizeImageUrl(u))
                .filter(Boolean);
              if (cleanedImages.length !== item.images.length) {
                item.images = cleanedImages;
                modified = true;
              }
            }
          }
          if (modified) {
            localStorage.setItem(key, JSON.stringify(parsed));
          }
        }
      }
    } catch {
      // Ignorer silencieusement toute erreur d'accès au stockage navigateur
    }
  }
}
