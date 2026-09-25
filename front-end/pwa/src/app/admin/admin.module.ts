import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { ViewGeneralSettingsComponent } from './general-settings/view-general-settings/view-general-settings.component';
import { GeneralSettingInputDialogComponent } from './general-settings/general-setting-dialog/general-setting-input-dialog.component';
import { ClimsoftBoundaryComponent } from './general-settings/general-setting-dialog/climsoft-boundary/climsoft-boundary.component';
import { MetadataModule } from '../metadata/metadata.module';
import { ClimsoftDisplayTimezoneComponent } from './general-settings/general-setting-dialog/climsoft-display-timezone/climsoft-display-timezone.component';
import { SchedulerSettingComponent } from './general-settings/general-setting-dialog/scheduler-setting/scheduler-setting.component';
import { ViewUsersComponent } from './users/view-users/view-users.component';
import { UserInputDialogComponent } from './users/user-input-dialog/user-input-dialog.component';
import { UserGroupSelectorSingleComponent } from './users/user-group-selector-single/user-group-selector-single.component';
import { PasswordChangeComponent } from './users/password-change/password-change.component';
import { ClimsoftV4Component } from './climsoft-v4/climsoft-v4.component';
import { ViewUserGroupsComponent } from './users/view-user-groups/view-user-groups.component';
import { UserGroupDetailsComponent } from './users/user-group-details/user-group-details.component';
import { EditUserPermissionsComponent } from './users/permissions/edit-user-permissions.component';
import { EditUserPermissionsDurationComponent } from './users/permissions/edit-user-permissions-duration/edit-user-permissions-duration.component';

// Job Queue components

// Connector Logs components
import { ViewConnectorRunsComponent } from './connector-runs/components/view-connector-runs/view-connector-runs.component';
import { RunDetailDialogComponent } from './connector-runs/components/run-detail-dialog/run-detail-dialog.component';
import { RunFilesTableComponent } from './connector-runs/components/run-files-table/run-files-table.component';
import { RunSpecsTableComponent } from './connector-runs/components/run-specs-table/run-specs-table.component';

@NgModule({
  declarations: [
    ViewGeneralSettingsComponent,
    GeneralSettingInputDialogComponent,
    ClimsoftBoundaryComponent,
    ClimsoftDisplayTimezoneComponent,
    SchedulerSettingComponent,
    ClimsoftV4Component,

    ViewUserGroupsComponent,
    ViewUsersComponent,
    UserGroupDetailsComponent,
    UserInputDialogComponent,
    EditUserPermissionsComponent,
    EditUserPermissionsDurationComponent,

    UserGroupSelectorSingleComponent,
    PasswordChangeComponent,

    // Job Queue

    // Connector Logs
    ViewConnectorRunsComponent,
    RunDetailDialogComponent,
    RunFilesTableComponent,
    RunSpecsTableComponent,

  ],
  imports: [
    SharedModule,
    MetadataModule,
    AdminRoutingModule
  ],
  exports: [
    PasswordChangeComponent,
  ],
})
export class AdminModule { }
