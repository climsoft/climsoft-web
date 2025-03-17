import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ObservationsService } from 'src/app/data-ingestion/services/observations.service';
import { ViewExportTemplateModel } from 'src/app/metadata/export-templates/models/view-export-template.model';
import { ExportTemplatesService } from 'src/app/metadata/export-templates/services/export-templates.service';

@Component({
  selector: 'app-manual-export-download',
  templateUrl: './manual-export-download.component.html',
  styleUrls: ['./manual-export-download.component.scss']
})
export class ManualExportDownloadComponent implements OnInit {
  protected viewExportTemplate!: ViewExportTemplateModel;
  protected hidePreparingExport: boolean = true;
  protected downloadLink: string = '';
  protected hideDownloadButton: boolean = true;

  constructor(
    private pagesDataService: PagesDataService,
    private route: ActivatedRoute,
    private exportTemplateService: ExportTemplatesService,
    private observationService: ObservationsService,) {
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

  protected onExportClick(): void {
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
