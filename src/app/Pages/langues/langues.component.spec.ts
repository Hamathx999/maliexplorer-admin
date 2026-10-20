import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LanguesComponent } from './langues.component';
import { LangueService } from '../../services/langue.service';
import { UploadService } from '../../services/upload.service';
import { LangueNationale } from '../../models/langue.model';

describe('LanguesComponent — Tests Empiriques & Robustesse', () => {
  let component: LanguesComponent;
  let mockLangueService: any;
  let mockUploadService: any;

  const mockLangue: LangueNationale = {
    id: 1,
    nom: 'Bamanankan (Bambara)',
    nomLocal: 'Bamanankan',
    locuteurs: '~80% de la population',
    regions: 'Bamako, Ségou',
    description: 'Langue nationale.',
    imageUrl: 'https://storage.supabase.co/bambara.jpg',
    ordreAffichage: 1,
    publie: true,
    lexique: [
      { mot: 'I ni sogoma', phonetique: 'i-ni-so-go-ma', traduction: 'Bonjour', categorie: 'Salutations' }
    ]
  };

  beforeEach(async () => {
    mockLangueService = {
      getAllLangues: vi.fn().mockReturnValue(of([mockLangue])),
      createLangue: vi.fn().mockReturnValue(of(mockLangue)),
      updateLangue: vi.fn().mockReturnValue(of(mockLangue)),
      deleteLangue: vi.fn().mockReturnValue(of(undefined)),
      togglePublication: vi.fn().mockReturnValue(of({ ...mockLangue, publie: false }))
    };

    mockUploadService = {
      uploadImage: vi.fn().mockReturnValue(of('https://storage.supabase.co/new.jpg'))
    };

    await TestBed.configureTestingModule({
      imports: [LanguesComponent],
      providers: [
        provideRouter([
          { path: 'langues', component: LanguesComponent },
          { path: 'langues/ajouter', component: LanguesComponent }
        ]),
        { provide: LangueService, useValue: mockLangueService },
        { provide: UploadService, useValue: mockUploadService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(LanguesComponent);
    component = fixture.componentInstance;
  });

  it('1. Initialise avec les langues chargées et un état cohérent', () => {
    component.ngOnInit();
    expect(mockLangueService.getAllLangues).toHaveBeenCalled();
    expect(component.langues.length).toBe(1);
    expect(component.isLoading).toBe(false);
    expect(component.isSubmitting).toBe(false);
  });

  it('2. Gère proprement une erreur de chargement sans bloquer le composant', () => {
    mockLangueService.getAllLangues.mockReturnValue(throwError(() => new Error('Erreur 500')));
    component.loadLangues();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Impossible de charger les langues nationales.');
  });

  it('3. Empêche la double soumission (verrou isSubmitting)', () => {
    component.nom = 'Nouvelle Langue';
    component.isSubmitting = true;

    component.onSubmit();

    expect(mockLangueService.createLangue).not.toHaveBeenCalled();
    expect(mockLangueService.updateLangue).not.toHaveBeenCalled();
  });

  it('4. Empêche la soumission pendant un téléversement d\'image en cours', () => {
    component.nom = 'Nouvelle Langue';
    component.isUploadingImage = true;

    component.onSubmit();

    expect(mockLangueService.createLangue).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('patienter');
  });

  it('5. Valide les champs obligatoires avant soumission (nom requis)', () => {
    component.nom = '   ';

    component.onSubmit();

    expect(mockLangueService.createLangue).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('nom officiel de la langue est obligatoire');
    expect(component.isSubmitting).toBe(false);
  });

  it('6. Réinitialise isSubmitting après une erreur de création HTTP', () => {
    mockLangueService.createLangue.mockReturnValue(throwError(() => new Error('HTTP 400 Bad Request')));
    component.nom = 'Langue Test';

    component.onSubmit();

    expect(component.isSubmitting).toBe(false);
    expect(component.errorMessage).toContain('Erreur lors de l\'ajout de la langue.');
  });

  it('7. addLexiqueItem() valide les entrées obligatoires (mot et traduction)', () => {
    component.newMot = '';
    component.newTraduction = '';
    component.addLexiqueItem();

    expect(component.lexiqueItems.length).toBe(0);
    expect(component.errorMessage).toContain('au minimum le mot');

    component.newMot = 'Anou';
    component.newTraduction = 'Nous';
    component.addLexiqueItem();

    expect(component.lexiqueItems.length).toBe(1);
    expect(component.lexiqueItems[0].mot).toBe('Anou');
    expect(component.newMot).toBe('');
  });

  it('8. resetForm() remet à zéro tous les champs et l\'état de soumission', () => {
    component.nom = 'Test';
    component.isSubmitting = true;
    component.isEditing = true;
    component.lexiqueItems = [{ mot: 'A', phonetique: '', traduction: 'B', categorie: 'Autre' }];

    component.resetForm();

    expect(component.nom).toBe('');
    expect(component.isSubmitting).toBe(false);
    expect(component.isEditing).toBe(false);
    expect(component.lexiqueItems.length).toBe(0);
    expect(component.editingId).toBeNull();
  });
});
