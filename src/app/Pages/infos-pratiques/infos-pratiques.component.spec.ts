import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { InfosPratiquesComponent } from './infos-pratiques.component';
import { InfoPratiqueService } from '../../services/info-pratique.service';
import { UploadService } from '../../services/upload.service';
import { InfoPratique } from '../../models/info-pratique.model';

describe('InfosPratiquesComponent — Tests Empiriques & Robustesse', () => {
  let component: InfosPratiquesComponent;
  let mockInfoService: any;
  let mockUploadService: any;

  const mockInfo: InfoPratique = {
    id: 1,
    titre: '1. Visas & Formalités',
    categorie: 'VISAS',
    description: 'Passeport valide au moins 6 mois.',
    conseils: '• Passeport valide 6 mois\n• Visa biométrique officiel',
    coordonnees: 'Ambassade du Mali',
    badge: 'Obligatoire',
    badgeColor: '#C53030',
    icon: 'badge',
    imageUrl: 'https://storage.supabase.co/visas.jpg',
    ordreAffichage: 1,
    publie: true
  };

  beforeEach(async () => {
    mockInfoService = {
      getAllInfosPratiques: vi.fn().mockReturnValue(of([mockInfo])),
      createInfoPratique: vi.fn().mockReturnValue(of(mockInfo)),
      updateInfoPratique: vi.fn().mockReturnValue(of(mockInfo)),
      deleteInfoPratique: vi.fn().mockReturnValue(of(undefined)),
      togglePublication: vi.fn().mockReturnValue(of({ ...mockInfo, publie: false }))
    };

    mockUploadService = {
      uploadImage: vi.fn().mockReturnValue(of('https://storage.supabase.co/new.jpg'))
    };

    await TestBed.configureTestingModule({
      imports: [InfosPratiquesComponent],
      providers: [
        provideRouter([
          { path: 'infos-pratiques', component: InfosPratiquesComponent },
          { path: 'infos-pratiques/ajouter', component: InfosPratiquesComponent }
        ]),
        { provide: InfoPratiqueService, useValue: mockInfoService },
        { provide: UploadService, useValue: mockUploadService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(InfosPratiquesComponent);
    component = fixture.componentInstance;
  });

  it('1. Initialise avec les infos pratiques chargées et filtres prêts', () => {
    component.ngOnInit();
    expect(mockInfoService.getAllInfosPratiques).toHaveBeenCalled();
    expect(component.infos.length).toBe(1);
    expect(component.filteredInfos.length).toBe(1);
    expect(component.activeCategory).toBe('ALL');
    expect(component.isSubmitting).toBe(false);
  });

  it('2. Gère proprement une erreur de chargement', () => {
    mockInfoService.getAllInfosPratiques.mockReturnValue(throwError(() => new Error('Connexion refusée')));
    component.loadInfos();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Impossible de charger les informations pratiques.');
  });

  it('3. Empêche la double soumission (verrou isSubmitting)', () => {
    component.titre = 'Info Test';
    component.categorie = 'VISAS';
    component.isSubmitting = true;

    component.onSubmit();

    expect(mockInfoService.createInfoPratique).not.toHaveBeenCalled();
    expect(mockInfoService.updateInfoPratique).not.toHaveBeenCalled();
  });

  it('4. Empêche la soumission pendant un téléversement d\'image en cours', () => {
    component.titre = 'Info Test';
    component.categorie = 'VISAS';
    component.isUploadingImage = true;

    component.onSubmit();

    expect(mockInfoService.createInfoPratique).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('patienter');
  });

  it('5. Valide les champs obligatoires (titre obligatoire)', () => {
    component.titre = '';
    component.categorie = 'VISAS';

    component.onSubmit();

    expect(mockInfoService.createInfoPratique).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('titre de l\'information pratique est obligatoire');
    expect(component.isSubmitting).toBe(false);
  });

  it('6. Réinitialise isSubmitting après une erreur de mise à jour HTTP', () => {
    mockInfoService.updateInfoPratique.mockReturnValue(throwError(() => new Error('HTTP 500')));
    component.editingId = 1;
    component.titre = 'Nouveau Titre';
    component.categorie = 'VISAS';

    component.onSubmit();

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toContain('Erreur lors de la mise à jour.');
  });

  it('7. Filtre correctement par catégorie active (VISAS vs SANTE)', () => {
    component.infos = [
      mockInfo,
      { ...mockInfo, id: 2, titre: 'Vaccins', categorie: 'SANTE' }
    ];

    component.filterByCategory('SANTE');
    expect(component.filteredInfos.length).toBe(1);
    expect(component.filteredInfos[0].titre).toBe('Vaccins');

    component.filterByCategory('ALL');
    expect(component.filteredInfos.length).toBe(2);
  });

  it('8. resetForm() remet à zéro tous les champs d\'édition', () => {
    component.editingId = 5;
    component.titre = 'Urgences';
    component.isSubmitting = true;
    component.isEditing = true;

    component.resetForm();

    expect(component.editingId).toBeNull();
    expect(component.titre).toBe('');
    expect(component.isSubmitting).toBe(false);
    expect(component.isEditing).toBe(false);
  });
});
