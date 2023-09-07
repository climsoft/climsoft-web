import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Station } from '../../shared/models/station.model';
import { EntryForm } from '../../shared/models/entryform.model';
import { EntryData } from '../../shared/models/entrydata.model';
import { RepoService } from '../../shared/services/repo.service';
import { Element } from '../../shared/models/element.model';
import { PagesDataService } from '../../shared/services/pages-data.service';
import { EntryDataSource } from '../../shared/models/entrydatasource.model';
import { DateUtils } from '../../shared/utils/date-utils';

export interface DataSelectorsValues {
  stationId: string,
  dataSourceId: number,
  entryForm: EntryForm,
  elementId: number;
  year: number;
  month: number;
  day: number;
  hour: number;
}


@Component({
  selector: 'app-form-entry',
  templateUrl: './form-entry.component.html',
  styleUrls: ['./form-entry.component.scss']
})
export class FormEntryComponent implements OnInit {
  dataSelectorsValues!: DataSelectorsValues;
  useDatePickerControl: boolean = false;
  defaultDatePickerDate!: string;
  entryControl: string = '';
  entryDataItems: EntryData[] = [];


  constructor(private repo: RepoService, private route: ActivatedRoute) {

    this.dataSelectorsValues = this.getNewInitialDataSelector();


  }

  ngOnInit(): void {
    this.dataSelectorsValues.stationId = this.route.snapshot.params['stationid'];
    this.dataSelectorsValues.dataSourceId = this.route.snapshot.params['datasourceid'];

    //todo. data source should be loaded based on station metadata
    const dataSource = this.repo.getDataSource(this.repo.getDataSources(1)[0].id)
    this.setFormSelectorsAndControl(JSON.parse(dataSource.extraMetadata))
    this.getEntryData();
  }


  private getNewInitialDataSelector(): DataSelectorsValues {
    return {
      stationId: '-1',
      dataSourceId: -1,
      entryForm: { entrySelectors: [], entryFields: [], entryControl: '', elements: [], hours: [], scale: 0, formValidations: '', samplePaperImage: '' },
      elementId: -1, year: -1, month: -1, day: -1, hour: -1
    };
  }

  private setFormSelectorsAndControl(entryForm: EntryForm) {

    this.dataSelectorsValues.entryForm = entryForm;

    if (entryForm.entrySelectors.includes('elementId')) {
      this.dataSelectorsValues.elementId = entryForm.elements[0];
    }

    const todayDate = new Date();

    if (entryForm.entrySelectors.includes('year')) {
      this.dataSelectorsValues.year = todayDate.getFullYear();
    }

    if (entryForm.entrySelectors.includes('month')) {
      this.dataSelectorsValues.month = todayDate.getMonth() + 1;
    }

    if (entryForm.entrySelectors.includes('day')) {
      this.dataSelectorsValues.day = todayDate.getDate();
    }

    if (entryForm.entrySelectors.includes('hour')) {
      this.dataSelectorsValues.hour = entryForm.hours.length > 0 ? entryForm.hours[0] : 0;
    }

    this.useDatePickerControl = entryForm.entrySelectors.includes('year') &&
      entryForm.entrySelectors.includes('month') &&
      entryForm.entrySelectors.includes('day');

    if (this.useDatePickerControl) {
      this.defaultDatePickerDate = todayDate.toISOString().slice(0, 10);
    }

    this.entryControl = entryForm.entryControl;
  }


  private getEntryData(): void {
    //get the data based on the station, data source and selectors
    this.entryDataItems = this.repo.getEntryDataItems(this.dataSelectorsValues);;
  }

  public onStationChange(stationId: string): void {

    this.dataSelectorsValues = this.getNewInitialDataSelector();
    this.dataSelectorsValues.stationId = stationId;

    //todo. data source should be loaded based on station metadata
    const dataSource = this.repo.getDataSource(this.repo.getDataSources(1)[0].id)
    this.dataSelectorsValues.dataSourceId = dataSource.id;


    this.setFormSelectorsAndControl(JSON.parse(dataSource.extraMetadata))
    this.getEntryData();
  }

  public onFormChange(dataSourceId: number): void {

    //store old station id
    const stationId: string = this.dataSelectorsValues.stationId;

    //reset the data selector values 
    this.dataSelectorsValues = this.getNewInitialDataSelector();

    //restore the station id
    this.dataSelectorsValues.stationId = stationId;

    //set new data source id
    this.dataSelectorsValues.dataSourceId = dataSourceId;

    //set the form selectors and control
    this.setFormSelectorsAndControl(JSON.parse(this.repo.getDataSource(dataSourceId).extraMetadata))

    this.getEntryData();
  }

  public onElementChange(elementId: number): void {
    this.dataSelectorsValues.elementId = elementId;
    this.getEntryData();
  }

  public onYearChange(year: any): void {
    this.dataSelectorsValues.year = year.id;
    this.getEntryData();
  }

  public onMonthChange(month: any): void {
    this.dataSelectorsValues.month = month.id;
    this.getEntryData();
  }

  public onDayChange(day: any): void {
    this.dataSelectorsValues.day = day.id;
    this.getEntryData();
  }

  public onDateChange(dateInput: string): void {
    const date = new Date(dateInput);
    this.dataSelectorsValues.year = date.getFullYear();
    this.dataSelectorsValues.month = date.getMonth() + 1;
    this.dataSelectorsValues.day = date.getDate();
    this.getEntryData();
  }

  public onHourChange(hourInput: number): void {
    this.dataSelectorsValues.hour = hourInput;
    this.getEntryData();
  }

  public onSave(): void {
    console.log("new values", this.entryDataItems)
    this.repo.saveEntryData(this.entryDataItems);
  }

  public onDelete(): void {

  }

  public onClear(): void {
    this.entryDataItems = [];
  }
}
