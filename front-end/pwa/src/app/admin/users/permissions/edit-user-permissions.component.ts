import { Component, Input } from '@angular/core';
import { UserPermissionModel } from '../models/user-permission.model';

@Component({
  selector: 'app-edit-user-permissions',
  templateUrl: './edit-user-permissions.component.html',
  styleUrls: ['./edit-user-permissions.component.scss']
})
export class EditUserPermissionsComponent {
  @Input()
  public userPermissions!: UserPermissionModel;

  constructor() {
  }

  //-----------------------------------------------------
  protected onCanEditStationMetadataChange(change: boolean): void {
    this.userPermissions.stationsMetadataPermissions = change ? {} : undefined;
  }

  protected onStationMetadataSelectionTypeChange(selectionType: string): void {
    if (this.userPermissions.stationsMetadataPermissions) {
      this.userPermissions.stationsMetadataPermissions.stationIds = (selectionType === 'All') ? undefined : [];
    }
  }

  //-----------------------------------------------------
  protected onCanEnterDataChange(change: boolean): void {
    this.userPermissions.entryPermissions = change ? {} : undefined;
  }

  protected onEntryStationsSelectionTypeChange(selectionType: string): void {
    if (this.userPermissions.entryPermissions) {
      this.userPermissions.entryPermissions.stationIds = (selectionType === 'All') ? undefined : [];
    }
  }
  //-----------------------------------------------------

    //-----------------------------------------------------
    protected onCanImportDataChange(change: boolean): void {
      this.userPermissions.importPermissions = change ? {} : undefined;
    }
  
    protected onImportSelectionTypeChange(selectionType: string): void {
      if (this.userPermissions.importPermissions) {
        this.userPermissions.importPermissions.importTemplateIds = (selectionType === 'All') ? undefined : [];
      }
    }
    //-----------------------------------------------------

  //-----------------------------------------------------
  protected onCanQCDataChange(change: boolean): void {
    this.userPermissions.qcPermissions = change ? {} : undefined;
  }

  protected onQCStationsSelectionTypeChange(selectionType: string): void {
    if (this.userPermissions.qcPermissions) {
      this.userPermissions.qcPermissions.stationIds = (selectionType === 'All') ? undefined : [];
    }
  }

  //-----------------------------------------------------
  protected onCanAnalyseDataChange(change: boolean): void {
    this.userPermissions.ingestionMonitoringPermissions = change ? {} : undefined;
  }

  protected onAnalysisStationsSelectionTypeChange(selectionType: string): void {
    if (this.userPermissions.ingestionMonitoringPermissions) {
      this.userPermissions.ingestionMonitoringPermissions.stationIds = (selectionType === 'All') ? undefined : [];
    }
  }

  //-----------------------------------------------------
  protected onCanExportDataChange(change: boolean): void {
    this.userPermissions.exportPermissions = change ? {} : undefined;
  }

  protected onExportSelectionTypeChange(selectionType: string): void {
    if (this.userPermissions.exportPermissions) {
      this.userPermissions.exportPermissions.exportTemplateIds = (selectionType === 'All') ? undefined : [];
    }
  }



}
