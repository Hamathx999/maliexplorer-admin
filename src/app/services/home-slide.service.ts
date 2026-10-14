import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HomeSlide } from '../models/home-slide.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HomeSlideService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/home-slides`;

  getAllSlides(): Observable<HomeSlide[]> {
    return this.http.get<HomeSlide[]>(this.apiUrl);
  }

  getActiveSlides(): Observable<HomeSlide[]> {
    return this.http.get<HomeSlide[]>(`${this.apiUrl}/actives`);
  }

  getSlideById(id: number): Observable<HomeSlide> {
    return this.http.get<HomeSlide>(`${this.apiUrl}/${id}`);
  }

  createSlide(slide: Partial<HomeSlide>): Observable<HomeSlide> {
    return this.http.post<HomeSlide>(this.apiUrl, slide);
  }

  updateSlide(id: number, slide: Partial<HomeSlide>): Observable<HomeSlide> {
    return this.http.put<HomeSlide>(`${this.apiUrl}/${id}`, slide);
  }

  deleteSlide(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleActif(id: number): Observable<HomeSlide> {
    return this.http.patch<HomeSlide>(`${this.apiUrl}/${id}/toggle-actif`, {});
  }

  setPrincipal(id: number): Observable<HomeSlide> {
    return this.http.patch<HomeSlide>(`${this.apiUrl}/${id}/set-principal`, {});
  }

  reordonner(slideIds: number[]): Observable<HomeSlide[]> {
    return this.http.put<HomeSlide[]>(`${this.apiUrl}/reordonner`, slideIds);
  }
}

