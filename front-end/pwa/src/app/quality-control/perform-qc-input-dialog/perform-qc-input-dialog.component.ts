import { Component, EventEmitter, Output } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { PerformQCParameters } from '../perform-qc-parameters.model';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-perform-qc-input-dialog',
  templateUrl: './perform-qc-input-dialog.component.html',
  styleUrls: ['./perform-qc-input-dialog.component.scss']
})
export class PerformQCInputDialogComponent {

  @Output()
  public ok = new EventEmitter<PerformQCParameters>();

  @Output()
  public cancelClick = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected observationFilter!: ViewObservationQueryModel;
  protected qcParameters!: PerformQCParameters;

  constructor(private pagesDataService: PagesDataService,) { }

  protected get componentName(): string {
    return PerformQCInputDialogComponent.name;
  }

  public openDialog(elementId: number, elementName: string): void {
    this.open = true;
    this.title = `${elementId} - ${elementName}: Perform QC tests for`;
    if (this.qcParameters) {
      this.qcParameters.elementId = elementId;
    } else {
      this.qcParameters = { elementId: elementId, observationFilter: { deleted: false }, qcStatus: QCStatusEnum.NONE }
    }
  }

  protected onRecordsSelectionChange(option: string): void {
    switch (option) {
      case 'All Records':
        this.qcParameters.qcStatus = undefined;
        break;
      case 'Records with no QC tests':
        this.qcParameters.qcStatus = QCStatusEnum.NONE;
        break;
      case 'Records that failed QC tests':
        this.qcParameters.qcStatus = QCStatusEnum.FAILED;
        break;
      case 'Records that passed QC tests':
        this.qcParameters.qcStatus = QCStatusEnum.PASSED;
        break;
      default:
        break;
    }
  }

  protected onOkClick(): void {
    if (!this.qcParameters.elementId) return;

    if (this.qcParameters.observationFilter.stationIds === undefined ||
      this.qcParameters.observationFilter.stationIds.length === 0) {
      this.pagesDataService.showToast({ title: "Perform QC", message: 'Station required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.qcParameters.observationFilter.level === undefined) {
       this.pagesDataService.showToast({ title: "Perform QC", message: 'Level required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.qcParameters.observationFilter.intervals === undefined ||
      this.qcParameters.observationFilter.intervals.length === 0) {
       this.pagesDataService.showToast({ title: "Perform QC", message: 'Interval required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.qcParameters.observationFilter.fromDate ||
      !this.qcParameters.observationFilter.toDate) {
       this.pagesDataService.showToast({ title: "Perform QC", message: 'Dates required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.ok.emit(this.qcParameters);
  }

  protected onCancelClick(): void {
    this.cancelClick.emit();
  }

}
