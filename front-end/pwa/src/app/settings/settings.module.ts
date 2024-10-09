import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { ViewGeneralSettingsComponent } from './general-settings/view-general-settings/view-general-settings.component';
import { EditGeneralSettingComponent } from './general-settings/edit-general-setting/edit-general-setting.component';
import { Setting1ParamsComponent } from './general-settings/edit-general-setting/setting-1-params/setting-1-params.component';



@NgModule({
  declarations: [
    ViewGeneralSettingsComponent,
    EditGeneralSettingComponent,
    Setting1ParamsComponent
  ],
  imports: [
    SharedModule,
    SettingsRoutingModule
  ]
})
export class SettingsModule { }
