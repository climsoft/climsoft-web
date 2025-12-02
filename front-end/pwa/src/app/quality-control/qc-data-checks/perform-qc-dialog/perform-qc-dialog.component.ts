import { Component, EventEmitter, Output } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { QCAssessmentsService } from '../../services/qc-assessments.service';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { DateUtils } from 'src/app/shared/utils/date.utils';

@Component({
  selector: 'app-perform-qc-dialog',
  templateUrl: './perform-qc-dialog.component.html',
  styleUrls: ['./perform-qc-dialog.component.scss']
})
export class PerformQCDialogComponent {
  @Output()
  public ok = new EventEmitter<void>();

  protected qcSelection!: ViewObservationQueryModel;

  protected open: boolean = false;

  constructor(private pagesDataService: PagesDataService,
    private qcAssessmentsService: QCAssessmentsService,) { }

  public showDialog(qcSelection: ViewObservationQueryModel): void {
    this.qcSelection = qcSelection;
    this.qcSelection.qcStatus = QCStatusEnum.NONE;
    this.open = true;
  }

  protected onRecordsSelectionChange(option: string): void {
    switch (option) {
      case 'All Records':
        this.qcSelection.qcStatus = undefined;
        break;
      case 'Records with no QC tests':
        this.qcSelection.qcStatus = QCStatusEnum.NONE;
        break;
      case 'Records that failed QC tests':
        this.qcSelection.qcStatus = QCStatusEnum.FAILED;
        break;
      case 'Records that passed QC tests':
        this.qcSelection.qcStatus = QCStatusEnum.PASSED;
        break;
      default:
        break;
    }
  }

  protected onOkClick(): void {
    if (!this.qcSelection.fromDate) {
      this.pagesDataService.showToast({ title: 'QC Assessment', message: 'From date selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.qcSelection.toDate) {
      this.pagesDataService.showToast({ title: 'QC Assessment', message: 'To date selection required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (DateUtils.isMoreThanMaxCalendarYears(new Date(this.qcSelection.fromDate), new Date(this.qcSelection.toDate), 11)) {
      this.pagesDataService.showToast({ title: 'QC Assessment', message: 'Date range exceeds 10 years', type: ToastEventTypeEnum.ERROR });
      return;
    }
    this.qcAssessmentsService.performQC(this.qcSelection).pipe(
      take(1),
    ).subscribe({
      next: data => {
        this.open = false;
        if (data.qcFails > 0) {
          this.pagesDataService.showToast({ title: 'QC Assessment', message: `Some observations failed qc tests`, type: ToastEventTypeEnum.WARNING });
        } else {
          this.pagesDataService.showToast({ title: 'QC Assessment', message: `No observation failed qc tests`, type: ToastEventTypeEnum.SUCCESS });
        }
        this.ok.emit();
      },
      error: err => {
        this.open = false;
        this.pagesDataService.showToast({ title: "QC Tests", message: `Error in saving qc test - ${err}`, type: ToastEventTypeEnum.ERROR, timeout: 8000 });
      }
    });
  }



}
