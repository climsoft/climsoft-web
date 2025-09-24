import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-query-qc-data-checks',
  templateUrl: './query-qc-data-checks.component.html',
  styleUrls: ['./query-qc-data-checks.component.scss']
})
export class QueryQCDataChecksComponent {

  @Input() public enableQueryButton: boolean = true;
  @Input() public enablePerformQCButton: boolean = true;
  @Output() public queryQCClick = new EventEmitter<ViewObservationQueryModel>();
  @Output() public performQCClick = new EventEmitter<ViewObservationQueryModel>();

  protected displayFilterControls: boolean = true;
  protected qcStatus: QCStatusEnum | undefined = QCStatusEnum.NONE;
  private filter!: ViewObservationQueryModel;

  constructor(private pagesDataService: PagesDataService,) {
  }

  protected get componentName(): string {
    return QueryQCDataChecksComponent.name;
  }

  protected onRecordsSelectionChange(option: string): void {
    switch (option) {
      case 'All Records':
        this.qcStatus = undefined;
        break;
      case 'Records with no QC tests':
        this.qcStatus = QCStatusEnum.NONE;
        break;
      case 'Records that failed QC tests':
        this.qcStatus = QCStatusEnum.FAILED;
        break;
      case 'Records that passed QC tests':
        this.qcStatus = QCStatusEnum.PASSED;
        break;
      default:
        break;
    }
  }

  protected onQueryClick(filter: ViewObservationQueryModel): void {
    this.filter = filter;
    this.queryQCClick.emit({ ...filter, qcStatus: QCStatusEnum.FAILED });
  }

  protected onPerformQCClick(): void {
    if (!this.filter || !this.filter.fromDate || !this.filter.toDate) {
      this.pagesDataService.showToast({ title: 'QC Data Checks', message: `Date selections required`, type: ToastEventTypeEnum.ERROR });
      return;
    }

    // TODO. Limit the date selection to 10 years at most

    this.performQCClick.emit({ ...this.filter, qcStatus: this.qcStatus });
  }


}
