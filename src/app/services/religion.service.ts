import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Religion } from '../models/religion.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReligionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/religions`;

  getAllReligions(): Observable<Religion[]> {
    return this.http.get<Religion[]>(`${this.apiUrl}/all`);
  }

  getPublishedReligions(): Observable<Religion[]> {
    return this.http.get<Religion[]>(this.apiUrl);
  }

  getReligionById(id: number): Observable<Religion> {
    return this.http.get<Religion>(`${this.apiUrl}/${id}`);
  }

  createReligion(religion: Partial<Religion>): Observable<Religion> {
    return this.http.post<Religion>(this.apiUrl, religion);
  }

  updateReligion(id: number, religion: Partial<Religion>): Observable<Religion> {
    return this.http.put<Religion>(`${this.apiUrl}/${id}`, religion);
  }

  deleteReligion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  togglePublication(id: number): Observable<Religion> {
    return this.http.patch<Religion>(`${this.apiUrl}/${id}/toggle-publication`, {});
  }
}

