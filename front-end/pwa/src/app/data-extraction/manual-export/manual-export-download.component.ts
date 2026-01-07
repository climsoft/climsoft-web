import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { SettingIdEnum } from 'src/app/admin/general-settings/models/setting-id.enum';
import { ClimsoftDisplayTimeZoneModel } from 'src/app/admin/general-settings/models/settings/climsoft-display-timezone.model';
import { GeneralSettingsService } from 'src/app/admin/general-settings/services/general-settings.service';
import { ExportTemplatePermissionsModel } from 'src/app/admin/users/models/permissions/user-permission.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { ExportTemplateParametersModel } from 'src/app/metadata/export-specifications/models/export-template-params.model';
import { ViewExportTemplateModel } from 'src/app/metadata/export-specifications/models/view-export-template.model';
import { ExportTemplatesService } from 'src/app/metadata/export-specifications/services/export-templates.service';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({
  selector: 'app-manual-export-download',
  templateUrl: './manual-export-download.component.html',
  styleUrls: ['./manual-export-download.component.scss']
})
export class ManualExportDownloadComponent implements OnInit {

  protected stationIds: string[] = [];
  protected sourceIds: number[] = [];
  protected elementIds: number[] = [];
  protected intervals: number[] = [];
  protected dateRange: DateRange = { fromDate: '', toDate: '' };
  protected maxDateRanges: DateRange = { fromDate: '', toDate: '' };
  protected includeOnlyStationIds: string[] = [];
  protected includeOnlyElementIds: number[] = [];
  protected includeOnlyIntervals: number[] = [];

  protected viewExportTemplate!: ViewExportTemplateModel;
  protected hidePreparingExport: boolean = true;
  protected downloadLink: string = '';
  protected hideDownloadButton: boolean = true;
  protected showDateSelection: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private exportTemplateService: ExportTemplatesService,
    private observationService: ObservationsService,
    private cachedMetadataService: CachedMetadataService,
    private route: ActivatedRoute,) {

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;

      let exportPermissions: ExportTemplatePermissionsModel = {};

      if (user.permissions && user.permissions.exportPermissions) {
        exportPermissions = user.permissions.exportPermissions;
      }

      if (exportPermissions.stationIds) {
        this.includeOnlyStationIds = exportPermissions.stationIds;
      }

      if (exportPermissions.elementIds) {
        this.includeOnlyElementIds = exportPermissions.elementIds;
      }

      if (exportPermissions.intervals) {
        this.includeOnlyIntervals = exportPermissions.intervals
      }

      const observationDate = exportPermissions.observationPeriod;
      if (observationDate) {
        if (observationDate.last) {
          // For last option
          this.showDateSelection = false
        } else {
          // For within and and from options
          this.showDateSelection = true;

          if (observationDate.within) {
            this.maxDateRanges = { ...observationDate.within };
          } else if (observationDate.fromDate) {
            this.maxDateRanges.fromDate = observationDate.fromDate;
          }
        }

      } else {
        // For all observation dates option
        this.showDateSelection = true;
      }

    });


  }

  ngOnInit(): void {
    const exportTemplateId = this.route.snapshot.params['id'];
    // TODO. handle errors where the export is not found for the given id
    this.exportTemplateService.findOne(+exportTemplateId).pipe(
      take(1)
    ).subscribe((data) => {
      this.viewExportTemplate = data;
      this.pagesDataService.setPageHeader(`Export From ${this.viewExportTemplate.name}`);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onGenerateExportClick(): void {

    const observationFilter: ViewObservationQueryModel = { deleted: false };;

    // Get the data based on the selection filter

    if (this.stationIds.length > 0) {
      observationFilter.stationIds = this.stationIds;
    }

    if (this.elementIds.length > 0) {
      observationFilter.elementIds = this.elementIds;
    }

    if (this.intervals.length > 0) {
      observationFilter.intervals = this.intervals;
    }

    // if (this.level !== null) {
    //   observationFilter.level = this.level;
    // }

    if (this.sourceIds.length > 0) {
      observationFilter.sourceIds = this.sourceIds;
    }

    if (this.dateRange.fromDate) {
      // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
      // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
      observationFilter.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(`${this.dateRange.fromDate}T00:00:00Z`, this.cachedMetadataService.utcOffSet, 'subtract');
    }

    if (this.dateRange.toDate) {
      // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
      // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
      observationFilter.toDate = DateUtils.getDatetimesBasedOnUTCOffset(`${this.dateRange.toDate}T23:59:00Z`, this.cachedMetadataService.utcOffSet, 'subtract');
    }

    this.hidePreparingExport = false;
    this.observationService.generateExport(this.viewExportTemplate.id, observationFilter).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.hidePreparingExport = true;
        this.downloadLink = this.observationService.getDownloadExportLink(data);
        this.hideDownloadButton = false;
      },
      error: err => {
        this.pagesDataService.showToast({ title: `Error in Generating Export`, message: err, type: ToastEventTypeEnum.ERROR });
        this.hidePreparingExport = false;
      }
    });
  }

  protected onDownloadStarted(): void {
    this.pagesDataService.showToast({ title: `${this.viewExportTemplate.name} Download`, message: 'Downloading...', type: ToastEventTypeEnum.INFO });
    this.hideDownloadButton = true;
  }

}
