import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './core/home/home.component'; 
import { DashboardComponent } from './core/dashboard/dashboard.component';
import { LoginComponent } from './core/login/login.component';
import { NotFoundComponent } from './core/not-found/not-found.component';
import { appAuthGuard } from './app-auth.guard';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    canActivate: [appAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'data-acquisition',
        loadChildren: () => import('./data-ingestion/data-ingestion.module').then((m) => m.DataIngestionModule)
      },
      {
        path: 'data-extraction',
        loadChildren: () => import('./data-extraction/data-extraction.module').then((m) => m.DataExtractionModule)
      },
      {
        path: 'metadata',
        loadChildren: () => import('./metadata/metadata.module').then((m) => m.MetadataModule)
      }, 
      {
        path: 'admin',
        loadChildren: () => import('./admin/admin.module').then((m) => m.AdminModule)
      },
    ]
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '**',
    component: NotFoundComponent,
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  providers: [{ provide: LocationStrategy, useClass: PathLocationStrategy }],
  exports: [RouterModule]
})
export class AppRoutingModule { }
