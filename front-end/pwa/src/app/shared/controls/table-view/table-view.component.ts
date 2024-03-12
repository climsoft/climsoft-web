import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent<TData> implements OnInit, OnChanges {
  @Input() clickable: boolean =false;
  @Input() columnsData!: { id: keyof TData, name: string }[];
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

  getRowDataItem(rowData:TData,  key: keyof TData): any{
    return  rowData[key  ];
  }

}
