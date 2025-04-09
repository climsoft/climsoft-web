import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { ViewExportTemplateModel } from 'src/app/metadata/export-templates/models/view-export-template.model';
import { ExportTemplatesService } from 'src/app/metadata/export-templates/services/export-templates.service';
import { DateRange } from 'src/app/shared/controls/date-range-input/date-range-input.component';

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
  protected dateRange: DateRange = {fromDate: '', toDate: ''};
  protected includeOnlyStationIds: string[] = [];
  protected includeOnlyElementIds: number[] = [];
  protected includeOnlyIntervals: number[] = [];

  protected viewExportTemplate!: ViewExportTemplateModel;
  protected hidePreparingExport: boolean = true;
  protected downloadLink: string = '';
  protected hideDownloadButton: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private exportTemplateService: ExportTemplatesService,
    private observationService: ObservationsService,
    private route: ActivatedRoute,) {
  }

  ngOnInit(): void {
    const exportTemplateId = this.route.snapshot.params['id'];
    // TODO. handle errors where the export is not found for the given id
    this.exportTemplateService.findOne(+exportTemplateId).pipe(
      take(1)
    ).subscribe((data) => {
      this.viewExportTemplate = data;
      this.pagesDataService.setPageHeader(`Export From ${this.viewExportTemplate.name}`);


      if (this.viewExportTemplate.parameters.stationIds) {
        this.includeOnlyStationIds = this.viewExportTemplate.parameters.stationIds;
      }

      if (this.viewExportTemplate.parameters.elementIds) {
        this.includeOnlyElementIds = this.viewExportTemplate.parameters.elementIds;
      }

      if (this.viewExportTemplate.parameters.intervals) {
        this.includeOnlyIntervals = this.viewExportTemplate.parameters.intervals
      }

    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onGenerateExportClick(view?: ViewObservationQueryModel): void {
    this.hidePreparingExport = false;
    this.observationService.generateExport(this.viewExportTemplate.id).pipe(
      take(1)
    ).subscribe((data) => {
      this.hidePreparingExport = true;
      this.downloadLink = this.observationService.getDownloadExportLink(data);
      this.hideDownloadButton = false;
    });
  }

  protected onDownloadStarted(): void {
    this.pagesDataService.showToast({ title: `${this.viewExportTemplate.name} Download`, message: 'Downloading...', type: ToastEventTypeEnum.INFO });
    this.hideDownloadButton = true;
  }

}
