import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'demo-info',
    loadComponent: () => import('./demo/demo-info').then((m) => m.DemoInfoComponent),
  },
  {
    path: 'workers/:id',
    loadComponent: () => import('./demo/demo-info').then((m) => m.DemoInfoComponent),
  },
  {
    path: 'worker/profile',
    canActivate: [authGuard],
    loadComponent: () => import('./demo/demo-info').then((m) => m.DemoInfoComponent),
  },
  {
    path: 'payments',
    canActivate: [authGuard],
    loadComponent: () => import('./features/payments/payments').then((m) => m.PaymentsComponent),
  },
  // =========================================================
  // PUBLIC
  // =========================================================

  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },

  {
    path: 'home',
    loadComponent: () => import('./features/home/home/home').then((m) => m.HomeComponent),
  },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },

  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },

  {
    path: 'become-worker-info',
    loadComponent: () =>
      import('./features/worker-info/worker-info').then((m) => m.WorkerInfoComponent),
  },

  {
    path: 'cookies',
    loadComponent: () => import('./features/cookies/cookies').then((m) => m.CookiesComponent),
  },

  {
    path: 'service-offerings',
    loadComponent: () =>
      import('./features/service-offerings/service-offering-search/service-offering-search').then(
        (m) => m.ServiceOfferingSearchComponent,
      ),
  },

  {
    path: 'services/:id',
    loadComponent: () =>
      import('./features/worker/service-offering/worker-service-offering-detail/worker-service-offering-detail').then(
        (m) => m.WorkerServiceOfferingDetailComponent,
      ),
  },

  {
    path: 'favorites',
    loadComponent: () => import('./features/favorites/favorites').then((m) => m.FavoritesComponent),
  },

  // =========================================================
  // AUTHENTICATED
  // =========================================================

  {
    path: 'become-worker',
    loadComponent: () =>
      import('./features/profile/worker-onboarding/worker-onboarding').then(
        (m) => m.WorkerOnboardingComponent,
      ),
    canActivate: [authGuard],
  },

  // =========================================================
  // CONVERSATIONS
  // =========================================================

  {
    path: 'conversations',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/conversations/conversations-layout/conversations-layout').then(
            (m) => m.ConversationsLayoutComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/conversations/conversations-layout/conversations-layout').then(
            (m) => m.ConversationsLayoutComponent,
          ),
      },
    ],
  },

  // =========================================================
  // DASHBOARDS
  // =========================================================

  {
    path: 'dashboard/client',
    loadComponent: () =>
      import('./features/dashboard/client-dashboard/client-dashboard').then(
        (m) => m.ClientDashboardComponent,
      ),
    canActivate: [authGuard],
  },

  {
    path: 'dashboard/worker',
    loadComponent: () =>
      import('./features/dashboard/worker-dashboard/worker-dashboard').then(
        (m) => m.WorkerDashboardComponent,
      ),
    canActivate: [authGuard],
  },

  {
    path: 'requests/open',
    loadComponent: () =>
      import('./features/requests/open-requests/open-requests').then(
        (m) => m.OpenRequestsComponent,
      ),
    canActivate: [authGuard],
  },

  {
    path: 'requests/new',
    loadComponent: () =>
      import('./features/requests/new-request/new-request').then((m) => m.NewRequestComponent),
    canActivate: [authGuard],
  },

  {
    path: 'requests/publish',
    loadComponent: () =>
      import('./features/requests/publish-request/publish-request').then(
        (m) => m.PublishRequestComponent,
      ),
    canActivate: [authGuard],
  },

  {
    path: 'requests/my',
    loadComponent: () =>
      import('./features/requests/my-requests/my-requests').then((m) => m.MyRequestsComponent),
    canActivate: [authGuard],
  },

  {
    path: 'requests/:id',
    loadComponent: () =>
      import('./features/requests/request-detail/request-detail').then(
        (m) => m.RequestDetailComponent,
      ),
    canActivate: [authGuard],
  },

  {
    path: 'worker/services/new',
    loadComponent: () =>
      import('./features/worker/service-offering/worker-service-offering-new/worker-service-offering-new').then(
        (m) => m.WorkerServiceOfferingNewComponent,
      ),
    canActivate: [authGuard],
  },

  // =========================================================
  // ADMIN
  // =========================================================

  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        redirectTo: 'workers/pending',
        pathMatch: 'full',
      },

      {
        path: 'workers/pending',
        loadComponent: () =>
          import('./features/admin/workers/pending-workers/pending-workers').then(
            (m) => m.PendingWorkersComponent,
          ),
      },
    ],
  },

  // =========================================================
  // FALLBACK
  // =========================================================

  {
    path: '**',
    redirectTo: 'home',
  },
];
