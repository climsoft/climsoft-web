import { Component } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ExportSpecificationsService } from '../services/export-templates.service';
import { ViewExportSpecificationModel } from '../models/view-export-specification.model';

@Component({
  selector: 'app-view-export-specifications',
  templateUrl: './view-export-specifications.component.html',
  styleUrls: ['./view-export-specifications.component.scss']
})
export class ViewExportSpecificationsComponent {
  protected exports!: ViewExportSpecificationModel[];

  constructor(
    private pagesDataService: PagesDataService,
    private exportsService: ExportSpecificationsService,) {
    this.pagesDataService.setPageHeader('Export Specifications');
    this.loadExportSpecifications();
  }

  private loadExportSpecifications(): void {
    this.exportsService.findAll().pipe(
      take(1),
    ).subscribe((data) => {
      this.exports = data;
    });
  }

  protected onOptionsClicked(option: 'Delete All') {
    switch (option) {
      case 'Delete All':
        this.exportsService.deleteAll().pipe(
          take(1),
        ).subscribe(() => {
          this.pagesDataService.showToast({ title: "Exports Deleted", message: `All exports deleted`, type: ToastEventTypeEnum.SUCCESS });
          this.loadExportSpecifications();
        });
        break;
      default:
        throw new Error('Developer Error. Option not supported');
    }
  }

  protected onExportInput(): void {
    this.loadExportSpecifications();
  }

}
