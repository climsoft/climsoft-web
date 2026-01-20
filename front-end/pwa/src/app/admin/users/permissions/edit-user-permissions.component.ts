import { Component, Input, OnDestroy } from '@angular/core';
import { UserPermissionModel } from '../models/permissions/user-permission.model';
import { Subject, takeUntil } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-edit-user-permissions',
  templateUrl: './edit-user-permissions.component.html',
  styleUrls: ['./edit-user-permissions.component.scss']
})
export class EditUserPermissionsComponent implements OnDestroy {
  @Input() public userPermissions!: UserPermissionModel;
  protected onlyIncludeImportIds: number[] = [];
  private destroy$ = new Subject<void>();

  constructor(private cachedMetadataService: CachedMetadataService) {
    // Get sources 
    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$)
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      // Note. Don't filter out disabled imports. 
      // Admin should be able to allocate even disabled imports because they may want to occassion enable or disable large imports.
      this.onlyIncludeImportIds = this.cachedMetadataService.sourcesMetadata.filter(item => item.sourceType === SourceTypeEnum.IMPORT).map(item => item.id);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  protected onExportStationsSelection(option: string): void {
    if (!this.userPermissions.exportPermissions) return;

    this.userPermissions.exportPermissions.stationIds = option === 'All' ? undefined : [];
  }

  protected onExportElementsSelection(option: string): void {
    if (!this.userPermissions.exportPermissions) return;

    this.userPermissions.exportPermissions.elementIds = option === 'All' ? undefined : [];
  }

  protected onExportIntervalsSelection(option: string): void {
    if (!this.userPermissions.exportPermissions) return;

    this.userPermissions.exportPermissions.intervals = option === 'All' ? undefined : [1440];
  }

  protected onExportPeriodSelection(option: string): void {
    if (!this.userPermissions.exportPermissions) return;

    if (option === 'All') {
      this.userPermissions.exportPermissions.observationPeriod = undefined;
    } else if (option === 'Within') {
      this.userPermissions.exportPermissions.observationPeriod = {
        within: {
          fromDate: DateUtils.getDateOnlyAsString(new Date()),
          toDate: DateUtils.getDateOnlyAsString(new Date()),
        },
      };
    } else if (option === 'From') {
      this.userPermissions.exportPermissions.observationPeriod = {
        fromDate: DateUtils.getDateOnlyAsString(new Date()),
      };
    } else if (option === 'Last') {
      this.userPermissions.exportPermissions.observationPeriod = {
        last: 60
      };
    }

  }



  protected onExportQcSelection(option: string): void {
    if (!this.userPermissions.exportPermissions) return;

    this.userPermissions.exportPermissions.qcStatuses = option === 'All' ? undefined : [QCStatusEnum.NONE, QCStatusEnum.PASSED];
  }

  protected onExportSpecificationSelection(selectionType: string): void {
    if (this.userPermissions.exportPermissions) {
      this.userPermissions.exportPermissions.exportTemplateIds = (selectionType === 'All') ? undefined : [];
    }
  }

}
