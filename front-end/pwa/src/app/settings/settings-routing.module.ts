import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';   
import { ViewGeneralSettingsComponent } from './general-settings/view-general-settings/view-general-settings.component';
import { EditGeneralSettingComponent } from './general-settings/edit-general-setting/edit-general-setting.component';


const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Settings'
    },
    children: [
      {
        path: '',
        redirectTo: 'view-general-settings',
        pathMatch: 'full',
      },
      {
        path: 'view-general-settings',
        component: ViewGeneralSettingsComponent, 
      },
      {
        path: 'edit-general-setting/:id',
        component: EditGeneralSettingComponent
      },
      {
        path: 'view-user-settings',
        component: ViewGeneralSettingsComponent, 
      }, 
      {
        path: 'view-user-setting/:id',
        component: ViewGeneralSettingsComponent
      },
      
     
    ]
  }
 
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SettingsRoutingModule { }
