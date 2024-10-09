import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { NumberUtils } from '../../utils/number.utils';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent<TData> implements OnInit, OnChanges {
  @Input() 
  clickable: boolean = false;

  @Input() 
  showRowNum: boolean = false;

  @Input() 
  page!: number;

  @Input() 
  pageSize!: number

  @Input() 
  columnsData!: { id: keyof TData, name: string }[];

  @Input() 
  rowsData!: TData[];

  @Output() 
  rowDataClicked = new EventEmitter<TData>();

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  onRowDataClicked(rowdataClicked: TData) {
    this.rowDataClicked.emit(rowdataClicked);
  }

  getRowDataItem(rowData: TData, key: keyof TData): any {
    return rowData[key];
  }

  protected getRowNumber(currentRowIndex: number): number {  
    return NumberUtils.getRowNumber(this.page, this.pageSize, currentRowIndex);
  }

}
