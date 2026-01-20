import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { ViewExportSpecificationModel } from '../models/view-export-specification.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ExportSpecificationsService } from '../services/export-templates.service';
import { CreateExportSpecificationModel } from '../models/create-export-specification.model';
import { ExportTypeEnum } from '../models/export-type.enum';

@Component({
  selector: 'app-export-specification-input-dialog',
  templateUrl: './export-specification-input-dialog.component.html',
  styleUrls: ['./export-specification-input-dialog.component.scss']
})
export class ExportSpecificationInputDialogComponent {
  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected viewExportSpecification!: ViewExportSpecificationModel;
  protected errorMessage!: string;
  protected disableStackedDataOpetions: boolean = false;

  constructor(
    private pagesDataService: PagesDataService,
    private exportSpecificationsService: ExportSpecificationsService,) {
  }

  public showDialog(exportId?: number): void {
    this.open = true;

    if (exportId) {
      this.pagesDataService.setPageHeader('Edit Export Specification');
      this.exportSpecificationsService.findOne(exportId).pipe(
        take(1),
      ).subscribe(data => {
        this.viewExportSpecification = data;
        this.disableStackedDataOpetions = this.viewExportSpecification.parameters.unstackData ? true : false;
      });
    } else {
      this.pagesDataService.setPageHeader('New Export Specification');
      this.viewExportSpecification = {
        id: 0,
        name: '',
        description: '',
        exportType: ExportTypeEnum.RAW,
        parameters: {},
        disabled: false,
        comment: null,
      };

    }
  }

  protected onUnstackData(value: boolean) {
    this.viewExportSpecification.parameters.unstackData = value;
    this.disableStackedDataOpetions = value

    if (value) {
      // Uncheck all stacked data options when unstack option is clicked
      this.viewExportSpecification.parameters.includeFlag = false;
      this.viewExportSpecification.parameters.includeQCStatus = false;
      this.viewExportSpecification.parameters.includeQCTestLog = false;
      this.viewExportSpecification.parameters.includeComments = false;
      this.viewExportSpecification.parameters.includeEntryDatetime = false;
      this.viewExportSpecification.parameters.includeEntryUserEmail = false;
    }

  }

  protected onSubmitClick(): void {
    this.errorMessage = '';

    if (!this.viewExportSpecification) {
      this.errorMessage = 'Template not defined';
      return;
    }

    if (!this.viewExportSpecification.name) {
      this.errorMessage = 'Enter template name';
      return;
    }

    if (!this.viewExportSpecification.description) {
      this.errorMessage = 'Enter template description';
      return;
    }


    const createExportSpecification: CreateExportSpecificationModel = {
      name: this.viewExportSpecification.name,
      description: this.viewExportSpecification.description,
      exportType: this.viewExportSpecification.exportType,
      parameters: this.viewExportSpecification.parameters,
      disabled: this.viewExportSpecification.disabled,
      comment: this.viewExportSpecification.comment,
    }

    let saveSubscription: Observable<ViewExportSpecificationModel>;
    if (this.viewExportSpecification.id > 0) {
      saveSubscription = this.exportSpecificationsService.update(this.viewExportSpecification.id, createExportSpecification);
    } else {
      saveSubscription = this.exportSpecificationsService.add(createExportSpecification);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.open = false;
        this.pagesDataService.showToast({ title: 'Export Specification', message: this.viewExportSpecification.id > 0 ? `Export specification updated` : `Export specification created`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: err => {
        this.open = false;
        console.log('error: ', err);
        this.pagesDataService.showToast({ title: 'Export Specification', message: `Error in saving export specification - ${err.message}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });

  }

  protected onDeleteClick(): void {
    //todo. prompt for confirmation first
    this.exportSpecificationsService.delete(this.viewExportSpecification.id).subscribe((data) => {
      this.open = false;
      this.pagesDataService.showToast({ title: "Export Specification", message: 'Export specification deleted', type: ToastEventTypeEnum.SUCCESS });
      this.ok.emit();
    });

  }

}
