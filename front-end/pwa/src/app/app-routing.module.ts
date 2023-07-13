import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [
      {
        path: '',
        redirectTo: 'dataentry',
        pathMatch: 'full'
      },
      {
        path: 'dataentry',
        loadChildren: () => import('./modules/dataentry/dataentry.module').then((m) => m.DataEntryModule)
      },
      {
        path: 'metadata',
        loadChildren: () => import('./modules/metadata/metadata.module').then((m) => m.MetadataModule)
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
