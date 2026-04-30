import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { Observable, take } from 'rxjs';
import { ViewExportSpecificationModel } from '../models/view-export-specification.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ExportSpecificationsService } from '../services/export-specifications.service';
import { CreateExportSpecificationModel } from '../models/create-export-specification.model';
import { ExportTypeEnum } from '../models/export-type.enum';
import { RawExportParametersModel } from '../models/raw-export-parameters.model';
import { BufrExportParametersModel, BufrTypeEnum } from '../models/bufr-export-parameters.model';
import { AggregateExportParametersModel } from '../models/aggregate-export-parameters.model';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-export-specification-input-dialog',
  templateUrl: './export-specification-input-dialog.component.html',
  styleUrls: ['./export-specification-input-dialog.component.scss']
})
export class ExportSpecificationInputDialogComponent {
  @ViewChild('dlgSaveConfirm') dlgSaveConfirm!: ConfirmationDialogComponent;
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: ConfirmationDialogComponent;

  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected viewExportSpecification!: ViewExportSpecificationModel;

  constructor(
    private pagesDataService: PagesDataService,
    private exportSpecificationsService: ExportSpecificationsService,
  ) {
  }


  public openDialog(exportId?: number): void {
    this.open = true;

    if (exportId) {
      this.title = 'Edit Export Specification';
      this.exportSpecificationsService.findOne(exportId).pipe(
        take(1),
      ).subscribe(data => {
        this.viewExportSpecification = data;
      });
    } else {
      this.title = 'New Export Specification';
      this.viewExportSpecification = {
        id: 0,
        name: '',
        description: '',
        exportType: ExportTypeEnum.RAW,
        parameters: {},
        adapterId: null,
        disabled: false,
        comment: null,
      };
    }
  }

  protected get rawParams(): RawExportParametersModel {
    return this.viewExportSpecification.parameters as RawExportParametersModel;
  }

  protected get bufrParams(): BufrExportParametersModel {
    return this.viewExportSpecification.parameters as BufrExportParametersModel;
  }

  protected onExportTypeChange(exportType: ExportTypeEnum): void {
    this.viewExportSpecification.exportType = exportType;

    switch (exportType) {
      case ExportTypeEnum.RAW:
        this.viewExportSpecification.parameters = {} as RawExportParametersModel;
        break;
      case ExportTypeEnum.BUFR:
        this.viewExportSpecification.parameters = {
          bufrType: BufrTypeEnum.SYNOP,
          elementMappings: []
        } as BufrExportParametersModel;
        break;
      case ExportTypeEnum.AGGREGATE:
        this.viewExportSpecification.parameters = {} as AggregateExportParametersModel;
        break;
    }
  }

  protected onSave(): void {
    if (StringUtils.isNullOrEmpty(this.viewExportSpecification.name)) {
      this.pagesDataService.showToast({ title: 'Import Specification', message: 'Name is required', type: ToastEventTypeEnum.ERROR });
    }

    if (StringUtils.isNullOrEmpty(this.viewExportSpecification.description)) {
      this.pagesDataService.showToast({ title: 'Import Specification', message: 'Description is required', type: ToastEventTypeEnum.ERROR });
    }

    this.dlgSaveConfirm.openDialog();
  }


  protected onSaveConfirm(): void {

    const createExportSpecification: CreateExportSpecificationModel = {
      name: this.viewExportSpecification.name,
      description: this.viewExportSpecification.description,
      exportType: this.viewExportSpecification.exportType,
      parameters: this.viewExportSpecification.parameters,
      disabled: this.viewExportSpecification.disabled,
      comment: this.viewExportSpecification.comment || null,
      adapterId: this.viewExportSpecification.adapterId || null,
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
      error: (err) => {
        console.error(err);
        this.open = false;
        this.pagesDataService.showToast({ title: 'Export Specification', message: err.error?.message || `Something bad happened`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });

  }

  protected onDeleteButtonClick(): void {
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    this.exportSpecificationsService.delete(this.viewExportSpecification.id).pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.open = false;
        this.pagesDataService.showToast({ title: "Export Specification", message: 'Export specification deleted', type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: (err) => {
        console.error(err);
        this.open = false;
        this.pagesDataService.showToast({ title: 'Export Specification', message: err.error?.message || `Something bad happened`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });
  }

}
