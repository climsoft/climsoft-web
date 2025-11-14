import { Component, Input, OnDestroy } from '@angular/core';
import { UserPermissionModel } from '../models/user-permission.model';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { Subject, takeUntil } from 'rxjs';
import { SourceTypeEnum } from 'src/app/metadata/source-templates/models/source-type.enum';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';

@Component({
  selector: 'app-edit-user-permissions',
  templateUrl: './edit-user-permissions.component.html',
  styleUrls: ['./edit-user-permissions.component.scss']
})
export class EditUserPermissionsComponent implements OnDestroy {
  @Input()
  public userPermissions!: UserPermissionModel;
  protected onlyIncludeImportIds: number[] = [];
  private destroy$ = new Subject<void>();

  constructor(private sourceCacheService: SourceTemplatesCacheService) {
    // Get sources 
    this.sourceCacheService.cachedSources.pipe(
      takeUntil(this.destroy$)
    ).subscribe((data) => {
      // Note. Don't filter out disabled imports. 
      // Admin should be able to allocate even disabled imports because they may want to occassion enable or disable large imports.
      this.onlyIncludeImportIds = data.filter(item => item.sourceType === SourceTypeEnum.IMPORT).map(item => item.id);
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

  protected onCanImportDataChange(change: boolean): void {
    if (this.userPermissions.entryPermissions) {
      this.userPermissions.entryPermissions.importPermissions = change ? {} : undefined;
    }
 
  }

  protected onImportSelectionTypeChange(selectionType: string): void {
    if (this.userPermissions.entryPermissions && this.userPermissions.entryPermissions.importPermissions) {
      this.userPermissions.entryPermissions.importPermissions.importTemplateIds = (selectionType === 'All') ? undefined : [];
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
       if (!this.userPermissions.exportPermissions)  return;

       this.userPermissions.exportPermissions.stationIds = option === 'All' ? undefined : [];
    }
  
    protected onExportElementsSelection(option: string): void {
        if (!this.userPermissions.exportPermissions)  return;

      this.userPermissions.exportPermissions.elementIds = option === 'All' ? undefined : [];
    }
  
    protected onExportIntervalsSelection(option: string): void {
        if (!this.userPermissions.exportPermissions)  return;

      this.userPermissions.exportPermissions.intervals = option === 'All' ? undefined : [1440]; 
    }
  
    protected onExportDateSelection(option: string): void {
        if (!this.userPermissions.exportPermissions)  return;

      if (option === 'All') {
        this.userPermissions.exportPermissions.observationDate = undefined;
      } else if (option === 'Within') {
        this.userPermissions.exportPermissions.observationDate = {
          within: {
            fromDate: DateUtils.getDateOnlyAsString(new Date()),
            toDate: DateUtils.getDateOnlyAsString(new Date()),
          },
        };
      } else if (option === 'From') {
        this.userPermissions.exportPermissions.observationDate = {
          fromDate: DateUtils.getDateOnlyAsString(new Date()),
        };
      } else if (option === 'Last') {
        this.userPermissions.exportPermissions.observationDate = {
          last: {
            duration: 31,
            durationType: 'days',
          }
        };
      }
  
    }
  
    protected onExportLastSelection(option: string): void {
       if (!this.userPermissions.exportPermissions)  return;

      if (!(this.userPermissions.exportPermissions.observationDate && this.userPermissions.exportPermissions.observationDate.last)) {
        return;
      }
  
      if (option === 'Days') {
        this.userPermissions.exportPermissions.observationDate.last.durationType = 'days';
      } else if (option === 'Hours') {
        this.userPermissions.exportPermissions.observationDate.last.durationType = 'hours';
      }
    }
  
    protected onExportQcSelection(option: string): void {
       if (!this.userPermissions.exportPermissions)  return;

      this.userPermissions.exportPermissions.qcStatus = option === 'All' ? undefined : QCStatusEnum.PASSED;
    }

  protected onExportTemplateSelection(selectionType: string): void {
    if (this.userPermissions.exportPermissions) {
      this.userPermissions.exportPermissions.exportTemplateIds = (selectionType === 'All') ? undefined : [];
    }
  }

}
