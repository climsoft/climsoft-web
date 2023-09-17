import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent  implements OnInit, OnChanges{

  @Input() columnData!: {id: string, name: string}[];
  @Input() rowData!: { [key: string]: any }[];
  @Output() rowDataClicked = new EventEmitter<{ [key: string]: any }>();

  constructor() {
  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  onRowDataClicked(rowdataClicked: { [key: string]: any }) {
    this.rowDataClicked.emit(rowdataClicked);
  }

}
