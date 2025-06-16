import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ViewObservationQueryModel } from 'src/app/data-ingestion/models/view-observation-query.model'; 
import { QCQueryModel } from '../../qc-query.model';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';

@Component({
  selector: 'app-query-qc-data-checks',
  templateUrl: './query-qc-data-checks.component.html',
  styleUrls: ['./query-qc-data-checks.component.scss']
})
export class QueryQCDataChecksComponent implements OnChanges {

  @Input() public enableQueryButton: boolean = true;
  @Output() public queryQCClick = new EventEmitter<QCQueryModel>();
   @Output() public performQCClick = new EventEmitter<QCQueryModel>();

  protected displayFilterControls: boolean = true;
  protected queryAllowed: boolean = true;
  protected query: ViewObservationQueryModel = { deleted: false };
  protected qcStatus: QCStatusEnum | undefined;


  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {

  }

  protected get componentName(): string {
    return QueryQCDataChecksComponent.name;
  }

  protected onQueryChange(query: ViewObservationQueryModel): void {
    this.query = query;
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

  protected onQueryClick(): void {
    const qcParameters: QCQueryModel = { ...this.query, qcStatus: this.qcStatus };
    this.queryQCClick.emit(qcParameters);
  }

    protected onPerformQCClick(): void {
 const qcParameters: QCQueryModel = { ...this.query, qcStatus: this.qcStatus };
    this.performQCClick.emit(qcParameters);
    }


}
