import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { ViewGeneralSettingsComponent } from './general-settings/view-general-settings/view-general-settings.component';
import { EditGeneralSettingComponent } from './general-settings/edit-general-setting/edit-general-setting.component';
import { ClimsoftBoundaryComponent } from './general-settings/edit-general-setting/climsoft-boundary/climsoft-boundary.component';
import { MetadataModule } from '../metadata/metadata.module';
import { ClimsoftDisplayTimezoneComponent } from './general-settings/edit-general-setting/climsoft-display-timezone/climsoft-display-timezone.component';
import { ViewUsersComponent } from './users/view-users/view-users.component';
import { UserDetailsComponent } from './users/user-details/user-details.component';
import { UserGroupSelectorSingleComponent } from './users/user-group-selector-single/user-group-selector-single.component';
import { PasswordChangeComponent } from './users/password-change/password-change.component';
import { ClimsoftV4Component } from './climsoft-v4/climsoft-v4.component';
import { ViewUserGroupsComponent } from './users/view-user-groups/view-user-groups.component';
import { UserGroupDetailsComponent } from './users/user-group-details/user-group-details.component';
import { EditUserPermissionsComponent } from './users/permissions/edit-user-permissions.component';
import { EditUserPermissionsDurationComponent } from './users/permissions/edit-user-permissions-duration/edit-user-permissions-duration.component';

// Job Queue components
import { ViewJobQueueComponent } from './job-queue/components/view-job-queue/view-job-queue.component';
import { JobDetailDialogComponent } from './job-queue/components/job-detail-dialog/job-detail-dialog.component';

// Connector Logs components
import { ViewConnectorLogsComponent } from './connector-logs/components/view-connector-logs/view-connector-logs.component';
import { ExecutionDetailDialogComponent } from './connector-logs/components/execution-detail-dialog/execution-detail-dialog.component';
import { JobTypeSelectorSingleComponent } from './job-queue/job-type-selector-single/job-type-selector-single.component';
import { JobStatusSelectorSingleComponent } from './job-queue/job-status-selector-single/job-status-selector-single.component';
import { JobTriggerSelectorSingleComponent } from './job-queue/components/job-trigger-selector-single/job-trigger-selector-single.component';

@NgModule({
  declarations: [
    ViewGeneralSettingsComponent,
    EditGeneralSettingComponent,
    ClimsoftBoundaryComponent,
    ClimsoftDisplayTimezoneComponent,
    ClimsoftV4Component,

    ViewUserGroupsComponent,
    ViewUsersComponent,
    UserGroupDetailsComponent,
    UserDetailsComponent,
    EditUserPermissionsComponent,
    EditUserPermissionsDurationComponent,

    UserGroupSelectorSingleComponent,
    PasswordChangeComponent,

    // Job Queue
    ViewJobQueueComponent,
    JobDetailDialogComponent,
    JobTypeSelectorSingleComponent,
    JobStatusSelectorSingleComponent,
    JobTriggerSelectorSingleComponent,

    // Connector Logs
    ViewConnectorLogsComponent,
    ExecutionDetailDialogComponent,
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
