import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EntryForm, LayoutType } from '../../core/models/entry-form.model';
import { ObservationModel } from '../../core/models/observation.model';
import { ObservationsService } from 'src/app/core/services/observations.service';
import { SourcesService } from 'src/app/core/services/sources.service';
import { SelectObservation } from 'src/app/core/models/select-observation.model';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ControlDefinition } from '../controls/value-flag-input/value-flag-input.component';
import { ElementsService } from 'src/app/core/services/elements.service';
import { FlagsService } from 'src/app/core/services/flags.service';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ElementModel } from 'src/app/core/models/element.model';

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
  public dataSelectors!: DataSelectorsValues;
  public formMetadata!: EntryForm;
  public useDatePickerControl: boolean = false;
  public defaultDatePickerDate!: string;
  public entryControl!: LayoutType;
  public elements!: ElementModel[];
  public observations!: ObservationModel[];
  public newObservations!: ObservationModel[];

  public flags!: FlagModel[];

  public stationName!: string;
  public formName!: string;


  constructor
    (private pagesDataService: PagesDataService,
      private sourcesService: SourcesService,
      private stationsService: StationsService,
      private elementsService: ElementsService,
      private flagsService: FlagsService,
      private observationService: ObservationsService,
      private route: ActivatedRoute,
      private location: Location) {

    this.pagesDataService.setPageHeader('Data Entry');

    this.flagsService.getFlags().subscribe(data => {
      this.flags = data;
    });
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
      this.loadSelectedElementsAndObservations();

    });

  }

  private setFormSelectorsAndControl(entryForm: EntryForm) {

    //set form metadata
    this.formMetadata = entryForm;

    if (entryForm.selectors.includes('ELEMENT')) {
      this.dataSelectors.elementId = entryForm.elements[0];
    }

    const todayDate = new Date();

    if (entryForm.selectors.includes('YEAR')) {
      this.dataSelectors.year = todayDate.getFullYear();
    }

    if (entryForm.selectors.includes('MONTH')) {
      this.dataSelectors.month = todayDate.getMonth() + 1;
    }

    if (entryForm.selectors.includes('DAY')) {
      this.dataSelectors.day = todayDate.getDate();
    }

    if (entryForm.selectors.includes('HOUR')) {
      this.dataSelectors.hour = entryForm.hours.length > 0 ? entryForm.hours[0] : 0;
    }

    this.useDatePickerControl = entryForm.selectors.includes('YEAR') &&
      entryForm.selectors.includes('MONTH') &&
      entryForm.selectors.includes('DAY');

    if (this.useDatePickerControl) {
      this.defaultDatePickerDate = todayDate.toISOString().slice(0, 10);
    }

    this.entryControl = entryForm.layout;
  }


  private loadSelectedElementsAndObservations() {

    this.elements = [];
    this.observations = [];
    this.newObservations = [];

    //determine which fields to use for loading the elements used in this control
    let elementsToSearch: number[] = [];
    if (this.dataSelectors.elementId > 0) {
      elementsToSearch.push(this.dataSelectors.elementId);
    } else if (this.formMetadata.entryFields.includes("elementId")) {
      elementsToSearch.push(...this.formMetadata.elements);
    } else {
      //todo. display error in set value flag set up
      return;
    }

    //note, its not expected that all elements in the database will be set as entry fields. 
    //that should be regarded as an error in form builder design.
    //so always assume that elements selected are provided
    //fetch the elements
    this.elementsService.getElements(elementsToSearch).subscribe(data => {
      //set the elements
      this.elements = data;
      this.getObservationData();
    });

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

    this.observationService.getObservations(select).subscribe((data) => {

      // Todo. Create a deep copy of original observations as well 
      // then compare them before saving to eliminate unchanged data
      this.observations = data;

    });
  }

  public onElementChange(elementIdSelected: any): void {
    this.dataSelectors.elementId = elementIdSelected;
    this.loadSelectedElementsAndObservations();
  }

  public onYearChange(yearInput: any): void {
    this.dataSelectors.year = yearInput.id;
    this.loadSelectedElementsAndObservations();
  }

  public onMonthChange(monthSelected: any): void {
    this.dataSelectors.month = monthSelected.id;
    this.loadSelectedElementsAndObservations();
  }

  public onDayChange(daySelected: any): void {
    this.dataSelectors.day = daySelected.id;
    this.loadSelectedElementsAndObservations();
  }

  onDateChange(dateInput: string): void {
    const date = new Date(dateInput);
    this.dataSelectors.year = date.getFullYear();
    this.dataSelectors.month = date.getMonth() + 1;
    this.dataSelectors.day = date.getDate();
    this.loadSelectedElementsAndObservations();
  }

  onHourChange(hourInput: number): void {
    this.dataSelectors.hour = hourInput;
    this.loadSelectedElementsAndObservations();
  }

  public onValueChange(newObservation: ObservationModel): void {
    //TODO. add to the list of observations changed for later elimintation checking
    // for instance if value was really changed or not

    const index = this.newObservations.findIndex((data) => (data === newObservation))
    if (index > -1) {
      this.newObservations[index] = newObservation;
    } else {
      this.newObservations.push(newObservation);
    }

  }

  onSaveClick(): void {

    // Todo. check for truly changed observations

    this.observationService.saveObservations(this.newObservations).subscribe((data) => {

      this.pagesDataService.showToast({
        title: 'Observations', message: `${data.length} observation${data.length === 1 ? '' : 's'} saved`, type: 'success'
      });

      this.loadSelectedElementsAndObservations();

    });
  }

  onCancelClick(): void {
    this.location.back();
  }


}
