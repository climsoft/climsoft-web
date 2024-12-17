import { NgModule } from '@angular/core'; 
import { SharedModule } from '../shared/shared.module';
import { SettingsRoutingModule } from './settings-routing.module';
import { ViewGeneralSettingsComponent } from './general-settings/view-general-settings/view-general-settings.component';
import { EditGeneralSettingComponent } from './general-settings/edit-general-setting/edit-general-setting.component';
import { ClimsoftBoundaryComponent } from './general-settings/edit-general-setting/climsoft-boundary/climsoft-boundary.component';
import { MetadataModule } from '../metadata/metadata.module';
import { ClimsoftDBComponent } from './general-settings/edit-general-setting/climsoft-v4-db-connection/climsoft-v4-db.component';
import { ClimsoftDisplayTimezoneComponent } from './general-settings/edit-general-setting/climsoft-display-timezone/climsoft-display-timezone.component';

@NgModule({
  declarations: [
    ViewGeneralSettingsComponent,
    EditGeneralSettingComponent,
    ClimsoftBoundaryComponent,
    ClimsoftDBComponent,
    ClimsoftDisplayTimezoneComponent,    
  ],
  imports: [
    SharedModule,
    MetadataModule,
    SettingsRoutingModule
  ]
})
export class SettingsModule { }
