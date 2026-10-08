import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, from, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UploadResponse {
  fileUrl: string;
  imageUrl?: string;
  fileName?: string;
  originalName?: string;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/images/upload`;

  /**
   * Téléverse un fichier image vers le backend Spring Boot (qui l'enregistre sur Supabase Storage et dans la table MySQL images).
   */
  uploadImage(file: File, folder: string = 'general', entiteType?: string, entiteId?: number | string): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }
    if (entiteType) {
      formData.append('entiteType', entiteType);
    }
    if (entiteId) {
      formData.append('entiteId', String(entiteId));
    }

    return this.http.post<UploadResponse>(this.apiUrl, formData).pipe(
      map((res) => {
        const url = res.fileUrl || res.imageUrl || '';
        if (!url) {
          throw new Error('Réponse serveur invalide : aucune URL d\'image retournée.');
        }
        return url;
      }),
      catchError((err) => {
        console.error('Erreur lors du téléversement vers le serveur backend :', err);
        const detail = err.error?.message || err.message || 'Erreur inconnue';
        throw new Error(`Échec du téléversement : ${detail}`);
      })
    );
  }

  /**
   * Téléverse un lot de plusieurs fichiers images vers le backend et retourne le tableau des URLs Supabase.
   */
  uploadMultipleImages(files: File[], folder: string = 'general', entiteType?: string, entiteId?: number | string): Observable<string[]> {
    if (!files || files.length === 0) {
      return from(Promise.resolve([]));
    }
    const uploads = files.map((f) => this.uploadImage(f, folder, entiteType, entiteId));
    return forkJoin(uploads);
  }

  private readFileAsDataUrl(file: File): Observable<string> {
    return from(
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      })
    );
  }
}

