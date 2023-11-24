import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';


interface DataTableItem {
  [key: string]: any;
}

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent<TData> implements OnInit, OnChanges {
  @Input() clickable: boolean =false;
  @Input() columnsData!: { id: string, name: string }[];
  @Input() rowsData!: TData[];
  @Output() rowDataClicked = new EventEmitter<TData>();

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  onRowDataClicked(rowdataClicked: TData) {
    this.rowDataClicked.emit(rowdataClicked);
  }

  getRowDataItem(rowData:TData,  key: string): any{
    return  rowData[key as keyof TData ];
  }

}
