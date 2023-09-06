import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';


export interface DataAction {
  actionName: string;
  actionCssClassName: string;
  actionIconCssClassName: string;
}

export interface DataClicked {
  actionName: string;
  dataSourceItem: { [key: string]: any };
}

@Component({
  selector: 'app-data-list-view',
  templateUrl: './data-list-view.component.html',
  styleUrls: ['./data-list-view.component.scss']
})
export class DataListViewComponent implements OnInit, OnChanges {
  //enforce the data source to be of key value
  @Input() numbered: boolean = false;
  @Input() dataSource!: { [key: string]: any }[];
  @Input() headerMembers!: string[];
  @Input() bodyMembers!: string[];
  @Input() actions!: DataAction[];

  @Output() dataActionClicked = new EventEmitter<DataClicked>();

  constructor() {
  }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
  }

  getDataSourceItemBodyContent1(dataSourceItem: { [key: string]: any }): string {
    let bodyContent: string = "";
    for (const member of this.bodyMembers) {
      if (bodyContent === '') {
        bodyContent = dataSourceItem[member];
      } else {
        bodyContent = bodyContent + " - " + dataSourceItem[member];
      }
    }
    return bodyContent;
  }

  getDataSourceItemHeaderContent(dataSourceItem: { [key: string]: any }): string {
    return this.headerMembers.map(member => dataSourceItem[member]).join(' - ');
  }

  getDataSourceItemBodyContent(dataSourceItem: { [key: string]: any }): string {
    return this.bodyMembers.map(member => dataSourceItem[member]).join(' - ');
  }

  onDataActionClicked(dataClicked: DataClicked) {
    this.dataActionClicked.emit(dataClicked);
  }

}
