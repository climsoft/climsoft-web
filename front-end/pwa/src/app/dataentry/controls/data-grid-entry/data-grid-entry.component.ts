import { Component, Input, ViewChild, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { Observation } from 'src/app/core/models/observation.model';
import { EntryForm } from 'src/app/core/models/entry-form.model';
//import { AgGridAngular } from 'ag-grid-angular';

//import { CellValueChangedEvent, ColDef } from 'ag-grid-community';



@Component({
  selector: 'app-data-grid-entry',
  templateUrl: './data-grid-entry.component.html',
  styleUrls: ['./data-grid-entry.component.scss']
})
export class DataGridEntryComponent implements OnInit, OnChanges {

  @Input() entryForm!: EntryForm;
  @Input() entryDataItems!: Observation[];

  rowDefinition: string = "";
  columnDefinition: string = "";
  columnNames!: string[];
  rowNames!: string[];
  newDataItems!: Observation[];

  //agrid inputs
  // For accessing the Grid's API
  //@ViewChild(AgGridAngular) agGrid!: AgGridAngular;
  //columnDefs!: ColDef[];
  rowData!: any[];
  elementsData: Element[] = [];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.newDataItems = [];
    this.setupGridControl();
  }

  ngOnInit(): void {
  }

  private setupGridControl(): void {

    //todo. This should load data for the elements selected only
    //should also check that all element names are unique to prevent data entry errors
    if (this.entryForm.entryFields.includes("elementId")) {
      //todo
      //this.elementsData = ELEMENTSLIST;
    }

    //get the row and column definitions from the entry fields
    this.rowDefinition = this.entryForm.entryFields[0];
    this.columnDefinition = this.entryForm.entryFields[1];
    let rowNames: string[] = [];
    this.columnNames = [];

    //Based on the row definition
    //1. first column name
    //2. row names (contents of the first column). 
    //3. the datafield that row name writes to
    if (this.rowDefinition === "elementId") {
      this.columnNames.push('Elements');
      this.addToStringArray(rowNames, this.entryForm.elements);
    } else if (this.rowDefinition === "day") {
      this.columnNames.push("Days");
      //this.addToStringArray(rowNames, DAYSLIST);
    } else if (this.rowDefinition === "hour") {
      this.columnNames.push("Hours");
      this.addToStringArray(rowNames, this.entryForm.hours);
    } 

    //Based on the column definition
    //1. the rest of the column names
    //2. the datafield that column name writes to
    if (this.columnDefinition === "elementId") {
      this.addToStringArray(this.columnNames, this.entryForm.elements);
    } else if (this.columnDefinition === "day") {
      //todo
      //this.addToStringArray(this.columnNames, DAYSLIST);
    } else if (this.columnDefinition === "hour") {
      this.addToStringArray(this.columnNames, this.entryForm.hours);
    } 


    //set column definition for the agrid. First column doesn't need a header name
    // this.columnDefs = [];
    // this.columnDefs.push({ field: this.columnNames[0], editable: false, resizable: true, wrapHeaderText: true, width: 120 });
    // for (let columnIndex: number = 1; columnIndex < this.columnNames.length; columnIndex++) {
    //   let colName: string = this.columnNames[columnIndex];
    //   let colHeaderName: string = colName;
    //   //for elements, jut show the abbreviation
    //   if (this.columnDefinition === 'elementId') {
    //     colHeaderName = this.getElementName(Number(colName));
    //   }
    //   this.columnDefs.push({ field: colName, headerName: colHeaderName, editable: true, resizable: true, wrapHeaderText: true, width: 120 });
    // }

    //st row data for agrid
    this.rowData = this.getGridData(rowNames, this.columnNames, this.entryForm.entryFields, this.entryDataItems);

  }//end method

  private addToStringArray(arr: string[], itemsToAdd: any[]): void {
    itemsToAdd.forEach((item) => {
      arr.push(item + "");
    });

  }

  private getGridData(rowNames: string[], columnNames: string[], entryFields: string[], entryDataItems: any[]): any[] {
    let rowData: any[] = [];
    //loop through all row names
    for (let rowIndex: number = 0; rowIndex < rowNames.length; rowIndex++) {
      //create a new row
      let row: any = {};

      let rowName = rowNames[rowIndex];

      //first column name should contain the row name
      row[columnNames[0]] = rowName;

      //loop through the remaining column names while using the data fields to get the row column('cell') value
      for (let columnIndex: number = 1; columnIndex < columnNames.length; columnIndex++) {
        let columName = columnNames[columnIndex];
        //put a value place holder       
        row[columName] = "";

        //fetch column value if it exists
        entryDataItems.forEach((entryData) => {

          //by default assume that the data item passes the data field conditions
          let bfound: boolean = false

          //first entry field corresponds to the row data field
          let rowDataField: string = entryFields[0];
          //second entry field corresponds to the column data field
          let colDataField: string = entryFields[1];
          //check the data field value against the row name and column name to determine if the value hould bepicked
          bfound = (entryData[rowDataField] == rowName && entryData[colDataField] == columName);

          if (bfound) {
            row[columName] = entryData['value'];
            return;//only one value expected
          }

        });

      }

      //add the row
      rowData.push(row)
    };
    return rowData;
  }

  private getElementName(elementId: number) {
    let elementName: string = "";
    // ELEMENTSLIST.forEach(element => {
    //   if (element.id === elementId) {
    //     elementName = element.name;
    //     return;
    //   }
    // });

    return elementName;

  }

  private getElementId(elementId: number) {
    let elementName: string = "";
    // ELEMENTSLIST.forEach(element => {
    //   if (element.id === elementId) {
    //     elementName = element.name;
    //     return;
    //   }
    // });

    return elementName;

  }

  // onCellValueChanged(e: CellValueChangedEvent): void {
  //   console.log('cellValueChanged', e);

  //   let rowData: any = e.data;
  //   let colId = e.column.getId();
  //   let value = e.value;


  //   let newEntryData: any = {
  //     stationId: 0,
  //     elementId: 0,
  //     entryFormId: 0,
  //     level: '',
  //     year: 0,
  //     month: 0,
  //     day: 0,
  //     hour: 0,
  //     value: 0,
  //     flag: '',
  //     paperImage: '',
  //     qcStatus: 0,
  //     changesLog: ''
  //   };

  //   //first column always corresponds to the row name which corresponds to the first entry field
  //   //so get the row name colum value from the irst column
  //   newEntryData[this.entryForm.entryFields[0]] = rowData[this.columnNames[0]];
  //   //column id changed should correspond to the second entry field
  //   newEntryData[this.entryForm.entryFields[1]] = colId;
  //   //set the value field
  //   newEntryData['value'] = value;

  //   console.log('new data', newEntryData);


  //   //do limits check
  //   //do totals check   
  //   this.newDataItems.push(newEntryData);


  // }





}
