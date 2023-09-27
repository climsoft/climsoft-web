import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EntryForm } from '../../core/models/entryform.model';
import { Observation } from '../../core/models/observation.model';
import { ObservationsService } from 'src/app/core/services/observations.service';
import { SourcesService } from 'src/app/core/services/sources.service';
import { SelectObservation } from 'src/app/core/models/select-observation.model';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

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
  observations!: Observation[];

  stationName!: string;
  formName!: string;
  bEnableSave: boolean = false;

  constructor
  ( private pagesDataService: PagesDataService,
    private sourcesService: SourcesService,
    private stationsService: StationsService,
    private observationService: ObservationsService,   
    private route: ActivatedRoute,
    private location: Location) {

    this.pagesDataService.setPageHeader('Data Entry');
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
      //the load the existing observation data
      this.getObservationData();

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

  private getObservationData(): void {
    //get the data based on the station, data source and selectors
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
    this.bEnableSave = false;
    this.observationService.getObservations(select).subscribe((data) => {
      console.log("Response", data);
      this.observations = data;
    });
  }


  public onElementChange(elementIdSelected: any): void {
    this.dataSelectors.elementId = elementIdSelected;
    this.getObservationData();
  }

  public onYearChange(yearInput: any): void {
    this.dataSelectors.year = yearInput.id;
    this.getObservationData();
  }

  public onMonthChange(monthSelected: any): void {
    this.dataSelectors.month = monthSelected.id;
    this.getObservationData();
  }

  public onDayChange(daySelected: any): void {
    this.dataSelectors.day = daySelected.id;
    this.getObservationData();
  }

  onDateChange(dateInput: string): void {
    const date = new Date(dateInput);
    this.dataSelectors.year = date.getFullYear();
    this.dataSelectors.month = date.getMonth() + 1;
    this.dataSelectors.day = date.getDate();
    this.getObservationData();
  }

  onHourChange(hourInput: number): void {
    this.dataSelectors.hour = hourInput;
    this.getObservationData();
  }

  onValueFlagEntryChange(validity: 'valid_value' | 'invalid_value') {
    this.bEnableSave = validity === 'valid_value';
  }

  onCancel(): void {
    this.location.back();
  }

  onSave(): void {
    console.log("saved values", this.observations);
    this.observationService.saveObservations(this.observations).subscribe((data) => {

      this.pagesDataService.showToast({
        title: 'observations', message: `${data.length} observation${data.length === 1 ? '' : 's'} saved`, type: 'success'
      });

      this.getObservationData();

    });
  }



}
