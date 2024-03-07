import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EntryForm } from '../../core/models/entry-form.model';
import { ObservationModel } from '../../core/models/observation.model';
import { ObservationsService } from 'src/app/core/services/observations.service';
import { SourcesService } from 'src/app/core/services/sources.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ElementsService } from 'src/app/core/services/elements.service';
import { FlagsService } from 'src/app/core/services/flags.service';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { StringUtils } from 'src/app/shared/utils/string.utils'; 
import { EntryFormFilter } from './form-entry.util';
import { SelectObservation } from 'src/app/core/models/dtos/select-observation.model';


export type SelectorControlType = 'ELEMENT' | 'YEAR' | 'MONTH' | 'DAY' | 'HOUR' | 'YEARMONTH' | 'DATE';

@Component({
  selector: 'app-form-entry',
  templateUrl: './form-entry.component.html',
  styleUrls: ['./form-entry.component.scss']
})
export class FormEntryComponent implements OnInit {
  protected formMetadata!: EntryForm;
  protected formFilter!: EntryFormFilter;


  protected elements!: ElementModel[];
  protected observations!: ObservationModel[];
  protected newObservations!: ObservationModel[];

  protected flags!: FlagModel[];

  protected stationName!: string;
  protected formName!: string;
  protected enableSave: boolean = false;

  protected selectorControlsToUse!: SelectorControlType[];
  protected defaultDateValue!: string;

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

    this.stationsService.getStationCharacteristics(stationId).subscribe((data) => {
      this.stationName = `${data.id} - ${data.name}`;
    });

    this.sourcesService.getSource(sourceId).subscribe((data) => {
      //set form name
      this.formName = data.name;
      //set form metadata
      this.formMetadata = JSON.parse(data.extraMetadata);

      this.formFilter = this.getSelectionFilter(stationId, sourceId, this.formMetadata);

      if ( this.formFilter.day) {
        this.defaultDateValue = new Date().toISOString().slice(0, 10)
      } else  {
        this.defaultDateValue = this.formFilter.year + '-' + StringUtils.addLeadingZero(this.formFilter.month);
      }

      //the load the existing observation data
      this.loadSelectedElementsAndObservations();

    });

  

  }

  private getSelectionFilter(stationId: string, sourceId: number, formMetadata: EntryForm): EntryFormFilter {
    const todayDate: Date = new Date();
    const formFilter: EntryFormFilter = {
      stationId: stationId, sourceId: sourceId, period: formMetadata.period,
      year: todayDate.getFullYear(), month: todayDate.getMonth() + 1
    };

    if (formMetadata.selectors.includes('ELEMENT')) {
      formFilter.elementId = formMetadata.elementIds[0];
    }

    if (formMetadata.selectors.includes('DAY')) {
      formFilter.day = todayDate.getDate();
    }

    if (formMetadata.selectors.includes('HOUR')) {    
      formFilter.hour = formMetadata.hours[0];
    }

    return formFilter;

  }

  private loadSelectedElementsAndObservations() {

    this.elements = [];
    this.observations = [];
    this.newObservations = [];

    //determine which fields to use for loading the elements used in this control
    let elementsToSearch: number[] = [];
    if (this.formFilter.elementId) {
      elementsToSearch.push(this.formFilter.elementId);
    } else if (this.formMetadata.fields.includes("ELEMENT")) {
      elementsToSearch.push(...this.formMetadata.elementIds);
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
    //get the data based on the selection filter
    const observationFilter: SelectObservation = {};
    observationFilter.stationId = this.formFilter.stationId;
    observationFilter.sourceId = this.formFilter.sourceId;
    observationFilter.period = this.formFilter.period;
    observationFilter.year = this.formFilter.year;
    observationFilter.month = this.formFilter.month;

    if (this.formFilter.day) {
      observationFilter.day = this.formFilter.day;
    }

    if (this.formFilter.elementId) {
      observationFilter.elementIds = [this.formFilter.elementId];
    } else {
      observationFilter.elementIds = this.formMetadata.elementIds;
    }

    if (this.formFilter.hour !== undefined) {
      observationFilter.hours = [this.formFilter.hour];
    } else {
      observationFilter.hours = this.formMetadata.hours;
    }

    this.observationService.getObservationsRaw(observationFilter).subscribe((data) => {
      this.observations = data;
    });
  }

  public onElementChange(elementIdInput: number| null): void {
    if(elementIdInput === null){
      return;
    }
    this.formFilter.elementId = elementIdInput;
    this.loadSelectedElementsAndObservations();
  }

  protected onYearMonthChange(yearMonthInput: string): void {
    const date: Date = new Date(yearMonthInput); 
    this.formFilter.year = date.getFullYear();
    this.formFilter.month = date.getMonth() + 1;
    this.loadSelectedElementsAndObservations();
  }

  protected onDateChange(dateInput: string|null): void {
    if(dateInput){
      const date: Date = new Date(dateInput); 
      this.formFilter.year = date.getFullYear();
      this.formFilter.month = date.getMonth() + 1;
      this.formFilter.day = date.getDate();
      this.loadSelectedElementsAndObservations();
    } 
  }

  protected onHourChange(hourIdInput: number | null): void {
    if(hourIdInput === null){
      return;
    }
    this.formFilter.hour = hourIdInput;
    this.loadSelectedElementsAndObservations();
  }

  protected onValueChange(newObservation: ObservationModel): void {
    const index = this.newObservations.findIndex((data) => (data === newObservation))
    if (index !== -1) {
      this.newObservations[index] = newObservation;
    } else {
      this.newObservations.push(newObservation);
    }

  }

  protected onEnableSave(enableSave: boolean): void {
    this.enableSave = enableSave;
  }

  protected onSaveClick(): void {
    this.enableSave = false;
    this.observationService.saveObservations(this.newObservations).subscribe((data) => {

      this.pagesDataService.showToast({
        title: 'Observations', message: `${data.length} observation${data.length === 1 ? '' : 's'} saved`, type: 'success'
      });

      this.loadSelectedElementsAndObservations();

    });
  }

  protected onCancelClick(): void {
    this.location.back();
  }


}
