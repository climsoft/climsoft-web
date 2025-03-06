import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, take } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ViewExportTemplateModel } from 'src/app/metadata/exports/models/view-export-template.model';
import { ExportTemplatesService } from 'src/app/metadata/exports/services/export-templates.service';

@Component({
  selector: 'app-manual-export-selection',
  templateUrl: './manual-export-selection.component.html',
  styleUrls: ['./manual-export-selection.component.scss']
})
export class ManualExportSelectionComponent {
  protected exports!: ViewExportTemplateModel[];
  constructor(
    private pagesDataService: PagesDataService,
    private exportTemplateService: ExportTemplatesService,
    private router: Router,
    private route: ActivatedRoute,) {
    this.pagesDataService.setPageHeader('Select Export');
    // Get all sources 
    this.exportTemplateService.findAll().pipe(
      take(1)
    ).subscribe((data) => {
      this.exports = data;
    });
  }

  protected onSearch(): void { }

  protected onExportClick(source: ViewExportTemplateModel): void {
    this.router.navigate(['manual-export-download', source.id], { relativeTo: this.route.parent });
  }

}
