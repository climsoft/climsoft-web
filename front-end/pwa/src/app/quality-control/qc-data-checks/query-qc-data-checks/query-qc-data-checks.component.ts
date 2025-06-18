import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-query-qc-data-checks',
  templateUrl: './query-qc-data-checks.component.html',
  styleUrls: ['./query-qc-data-checks.component.scss']
})
export class QueryQCDataChecksComponent implements OnChanges {

  @Input() public enableQueryButton: boolean = true;
   @Input() public enablePerformQCButton: boolean = true;
  @Output() public queryQCClick = new EventEmitter<ViewObservationQueryModel>();
  @Output() public performQCClick = new EventEmitter<ViewObservationQueryModel>();

  protected displayFilterControls: boolean = true;
  protected queryAllowed: boolean = true; 
  protected qcStatus: QCStatusEnum | undefined;

  constructor(private pagesDataService: PagesDataService,) { 
  }

  ngOnChanges(changes: SimpleChanges): void {

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

  protected onQueryClick(query: ViewObservationQueryModel): void {
    this.queryQCClick.emit({ ...query, qcStatus: QCStatusEnum.FAILED });
  }

  protected onPerformQCClick(query: ViewObservationQueryModel): void {
    if (!query || !query.fromDate || !query.toDate) {
      this.pagesDataService.showToast({ title: 'QC Data Checks', message: `Date selections required`, type: ToastEventTypeEnum.ERROR });
      return;
    }

    // TODO. Limit the date selection to 10 years at most

    this.performQCClick.emit({ ...query, qcStatus: this.qcStatus });
  }


}
