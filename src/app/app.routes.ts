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
import { LoginComponent } from './Pages/login/login.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    title: 'Connexion - MaliExplorer Admin'
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    title: 'Tableau de bord - MaliExplorer Admin'
  },
  {
    path: 'lieux-historiques',
    component: LieuxHistoriquesComponent,
    canActivate: [authGuard],
    title: 'Gestion des Lieux Historiques - MaliExplorer Admin'
  },
  {
    path: 'lieux-historiques/ajouter',
    component: LieuxHistoriquesComponent,
    canActivate: [authGuard],
    title: 'Ajouter un Lieu Historique - MaliExplorer Admin'
  },
  {
    path: 'evenements/ajouter',
    component: EvenementsComponent,
    canActivate: [authGuard],
    title: 'Ajouter un evenement - MaliExplorer Admin'
  },
  {
    path: 'admin/lieux-historiques',
    redirectTo: 'lieux-historiques',
    pathMatch: 'full'
  },
  {
    path: 'ethnies',
    component: EthniesComponent,
    canActivate: [authGuard],
    title: 'Gestion des Ethnies - MaliExplorer Admin'
  },
  {
    path: 'presidents',
    component: PresidentsComponent,
    canActivate: [authGuard],
    title: 'Gestion des Chefs d\'État - MaliExplorer Admin'
  },
  {
    path: 'utilisateurs',
    component: UtilisateursComponent,
    canActivate: [authGuard],
    title: 'Gestion des Utilisateurs - MaliExplorer Admin'
  },
  {
    path: 'evenements',
    component: EvenementsComponent,
    canActivate: [authGuard],
    title: 'Gestion des Événements - MaliExplorer Admin'
  },
  {
    path: 'validation-evenement',
    component: ValidationEvenementComponent,
    canActivate: [authGuard],
    title: 'Modération d\'Événements - MaliExplorer Admin'
  },
  {
    path: 'validation-evenement/:id',
    component: ValidationEvenementComponent,
    canActivate: [authGuard],
    title: 'Modération d\'Événement - MaliExplorer Admin'
  },
  {
    path: 'evenements/validation/:id',
    component: ValidationEvenementComponent,
    canActivate: [authGuard],
    title: 'Modération d\'Événement - MaliExplorer Admin'
  },
  {
    path: 'plats',
    component: PlatsComponent,
    canActivate: [authGuard],
    title: 'Gestion des Plats - MaliExplorer Admin'
  },
  {
    path: 'ingredients',
    component: IngredientsComponent,
    canActivate: [authGuard],
    title: 'Gestion des Ingrédients - MaliExplorer Admin'
  },
  {
    path: 'quiz',
    component: QuizComponent,
    canActivate: [authGuard],
    title: 'Gestion des Quiz - MaliExplorer Admin'
  },
  {
    path: 'questions',
    component: QuestionsComponent,
    canActivate: [authGuard],
    title: 'Gestion des Questions - MaliExplorer Admin'
  },
  {
    path: 'regions',
    component: RegionsComponent,
    canActivate: [authGuard],
    title: 'Gestion des Régions - MaliExplorer Admin'
  },
  {
    path: 'villes',
    component: VillesComponent,
    canActivate: [authGuard],
    title: 'Gestion des Villes - MaliExplorer Admin'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
