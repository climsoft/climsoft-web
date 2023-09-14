import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { EntryForm } from '../../core/models/entryform.model';
import { Observation } from '../../core/models/observation.model';
import { ObservationsService } from 'src/app/core/services/observations.service';
import { SourcesService } from 'src/app/core/services/sources.service';
import { SelectObservation } from 'src/app/core/models/select-observation.model';
import { StationsService } from 'src/app/core/services/stations.service';

export interface DataSelectorsValues {
  stationId: string;
  sourceId: number;
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
  dataSelectors!: DataSelectorsValues;
  formMetadata!: EntryForm;
  useDatePickerControl: boolean = false;
  defaultDatePickerDate!: string;
  entryControl!: string;
  observations: Observation[] = [];

  stationName!: string;
  formName!: string;

  constructor(private sourcesService: SourcesService, private stationsService: StationsService, private observationService: ObservationsService, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const stationId = this.route.snapshot.params['stationid'];
    const sourceId = +this.route.snapshot.params['datasourceid'];

    //set data selector
    this.dataSelectors = {
      stationId: stationId,
      sourceId: sourceId,
      elementId: -1, year: -1, month: -1, day: -1, hour: -1
    }

    this.stationsService.getStation(stationId).subscribe((data) => {
      this.stationName = `${data.id} - ${data.name}`;
    });

    this.sourcesService.getSource(this.dataSelectors.sourceId).subscribe((data) => {
      this.formName = data.name;
      //first set up the controls. this will set the form selectors 
      this.setFormSelectorsAndControl(JSON.parse(data.extraMetadata));
      this.getEntryData();

    });

  }

  private getEntryData(): void {
    //get the data based on the station, data source and selectors
    //this.entryDataItems = this.repo.getEntryDataItems(this.dataSelectorsValues);

    const select: SelectObservation = {};

    select.stationId = this.dataSelectors.stationId;
    select.sourceId = this.dataSelectors.sourceId;

    if (this.dataSelectors.elementId > 0) {
      select.elementId = this.dataSelectors.elementId;
    }

    if (this.dataSelectors.year > 0) {
      select.year = this.dataSelectors.year;
    }

    if (this.dataSelectors.month > 0) {
      select.month = this.dataSelectors.month;
    }

    if (this.dataSelectors.day > 0) {
      select.day = this.dataSelectors.day;
    }

    if (this.dataSelectors.hour > -1) {
      select.hour = this.dataSelectors.hour;
    }

    console.log("selections", select);
    this.observationService.getObservations(select).subscribe((data) => {
      console.log("Response", data);
      this.observations = data;
    });
  }

  private setFormSelectorsAndControl(entryForm: EntryForm) {

    //set form metadata
    this.formMetadata = entryForm;

    if (entryForm.entrySelectors.includes('elementId')) {
      this.dataSelectors.elementId = entryForm.elements[0];
    }

    const todayDate = new Date();

    if (entryForm.entrySelectors.includes('year')) {
      this.dataSelectors.year = todayDate.getFullYear();
    }

    if (entryForm.entrySelectors.includes('month')) {
      this.dataSelectors.month = todayDate.getMonth() + 1;
    }

    if (entryForm.entrySelectors.includes('day')) {
      this.dataSelectors.day = todayDate.getDate();
    }

    if (entryForm.entrySelectors.includes('hour')) {
      this.dataSelectors.hour = entryForm.hours.length > 0 ? entryForm.hours[0] : 0;
    }

    this.useDatePickerControl = entryForm.entrySelectors.includes('year') &&
      entryForm.entrySelectors.includes('month') &&
      entryForm.entrySelectors.includes('day');

    if (this.useDatePickerControl) {
      this.defaultDatePickerDate = todayDate.toISOString().slice(0, 10);
    }

    this.entryControl = entryForm.entryControl;
  }

  public onElementChange(elementId: number): void {
    this.dataSelectors.elementId = elementId;
    this.getEntryData();
  }

  public onYearChange(year: any): void {
    this.dataSelectors.year = year.id;
    this.getEntryData();
  }

  public onMonthChange(month: any): void {
    this.dataSelectors.month = month.id;
    this.getEntryData();
  }

  public onDayChange(day: any): void {
    this.dataSelectors.day = day.id;
    this.getEntryData();
  }

  public onDateChange(dateInput: string): void {
    const date = new Date(dateInput);
    this.dataSelectors.year = date.getFullYear();
    this.dataSelectors.month = date.getMonth() + 1;
    this.dataSelectors.day = date.getDate();
    this.getEntryData();
  }

  public onHourChange(hourInput: number): void {
    this.dataSelectors.hour = hourInput;
    this.getEntryData();
  }

  public onClear(): void {
    this.observations = [];
  }

  public onSave(): void {
    console.log("saved values", this.observations)
    this.observationService.saveObservations(this.observations).subscribe((data) => {
      this.getEntryData();
    })
  }

  public onDelete(): void {

  }




}
