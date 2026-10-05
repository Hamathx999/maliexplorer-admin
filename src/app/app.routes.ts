import { Routes } from '@angular/router';
import { DashboardComponent } from './Pages/dashboard/dashboard.component';
import { RegionsComponent } from './Pages/regions/regions.component';
import { UtilisateursComponent } from './Pages/utilisateurs/utilisateurs.component';
import { EvenementsComponent } from './Pages/evenements/evenements.component';
import { VillesComponent } from './Pages/villes/villes.component';
import { EthniesComponent } from './Pages/ethnies/ethnies.component';
import { PresidentsComponent } from './Pages/presidents/presidents.component';
import { LieuxHistoriquesComponent } from './Pages/lieux-historiques/lieux-historiques.component';
import { ValidationEvenementComponent } from './Pages/evenements/validation-evenement.component';
import { QuizComponent } from './Pages/quiz/quiz.component';
import { QuestionsComponent } from './Pages/questions/questions.component';
import { PlatsComponent } from './Pages/plats/plats.component';
import { IngredientsComponent } from './Pages/ingredients/ingredients.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Tableau de bord - MaliExplorer Admin'
  },
  {
    path: 'regions',
    component: RegionsComponent,
    title: 'Gestion des Régions - MaliExplorer Admin'
  },
  {
    path: 'villes',
    component: VillesComponent,
    title: 'Gestion des Villes - MaliExplorer Admin'
  },
  {
    path: 'lieux-historiques',
    component: LieuxHistoriquesComponent,
    title: 'Gestion des Lieux Historiques - MaliExplorer Admin'
  },
  {
    path: 'ethnies',
    component: EthniesComponent,
    title: 'Gestion des Ethnies - MaliExplorer Admin'
  },
  {
    path: 'presidents',
    component: PresidentsComponent,
    title: 'Gestion des Chefs d\'État - MaliExplorer Admin'
  },
  {
    path: 'utilisateurs',
    component: UtilisateursComponent,
    title: 'Gestion des Utilisateurs - MaliExplorer Admin'
  },
  {
    path: 'evenements',
    component: EvenementsComponent,
    title: 'Gestion des Événements - MaliExplorer Admin'
  },
  {
    path: 'validation-evenement',
    component: ValidationEvenementComponent,
    title: 'Modération d\'Événements - MaliExplorer Admin'
  },
  {
    path: 'validation-evenement/:id',
    component: ValidationEvenementComponent,
    title: 'Modération d\'Événement - MaliExplorer Admin'
  },
  {
    path: 'evenements/validation/:id',
    component: ValidationEvenementComponent,
    title: 'Modération d\'Événement - MaliExplorer Admin'
  },
  {
    path: 'plats',
    component: PlatsComponent,
    title: 'Gestion des Plats - MaliExplorer Admin'
  },
  {
    path: 'ingredients',
    component: IngredientsComponent,
    title: 'Gestion des Ingrédients - MaliExplorer Admin'
  },
  {
    path: 'quiz',
    component: QuizComponent,
    title: 'Gestion des Quiz - MaliExplorer Admin'
  },
  {
    path: 'questions',
    component: QuestionsComponent,
    title: 'Gestion des Questions - MaliExplorer Admin'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
