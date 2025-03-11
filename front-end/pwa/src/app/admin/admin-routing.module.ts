import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewGeneralSettingsComponent } from './general-settings/view-general-settings/view-general-settings.component';
import { EditGeneralSettingComponent } from './general-settings/edit-general-setting/edit-general-setting.component';
import { ClimsoftV4Component } from './climsoft-v4/climsoft-v4.component';
import { ViewUsersComponent } from './users/view-users/view-users.component';
import { UserDetailsComponent } from './users/user-details/user-details.component';
import { ViewAuditsComponent } from './audits/view-audits/view-audits.component';
import { ViewUserGroupsComponent } from './users/view-user-groups/view-user-groups.component';
import { UserGroupDetailsComponent } from './users/user-group-details/user-group-details.component';


const routes: Routes = [
  {
    path: '',
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
        path: 'climsoft-v4',
        component: ClimsoftV4Component,
      },
      {
        path: 'view-user-groups',
        component: ViewUserGroupsComponent,
      },
      {
        path: 'user-group-details/:id',
        component: UserGroupDetailsComponent,
      },
      {
        path: 'view-users',
        component: ViewUsersComponent,
      },
      {
        path: 'user-details/:id',
        component: UserDetailsComponent
      },
      {
        path: 'view-audits',
        component: ViewAuditsComponent,
      },
    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
