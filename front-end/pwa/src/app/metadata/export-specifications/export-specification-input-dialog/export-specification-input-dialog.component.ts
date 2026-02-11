import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { ViewExportSpecificationModel } from '../models/view-export-specification.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ExportSpecificationsService } from '../services/export-specifications.service';
import { CreateExportSpecificationModel } from '../models/create-export-specification.model';
import { ExportTypeEnum } from '../models/export-type.enum';
import { RawExportParametersModel } from '../models/raw-export-parameters.model';
import { BufrExportParametersModel, BufrTypeEnum } from '../models/bufr-export-parameters.model';
import { AggregateExportParametersModel } from '../models/aggregate-export-parameters.model';

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

  constructor(
    private pagesDataService: PagesDataService,
    private exportSpecificationsService: ExportSpecificationsService,) {
  }

  public showDialog(exportId?: number): void {
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

  protected onSubmitClick(): void {
    this.errorMessage = '';

    if (!this.viewExportSpecification) {
      this.errorMessage = 'Specification not defined';
      return;
    }

    if (!this.viewExportSpecification.name) {
      this.errorMessage = 'Enter specification name';
      return;
    }

    if (!this.viewExportSpecification.description) {
      this.errorMessage = 'Enter specification description';
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
    if (!confirm('Are you sure you want to delete this specification?')) {
      this.open = false;
      return;
    }

    this.exportSpecificationsService.delete(this.viewExportSpecification.id).subscribe((data) => {
      this.open = false;
      this.pagesDataService.showToast({ title: "Export Specification", message: 'Export specification deleted', type: ToastEventTypeEnum.SUCCESS });
      this.ok.emit();
    });

  }

}
