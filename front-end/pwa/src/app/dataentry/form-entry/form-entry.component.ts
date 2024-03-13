import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EntryForm } from '../../core/models/entry-form.model';
import { ObservationsService } from 'src/app/core/services/observations.service';
import { SourcesService } from 'src/app/core/services/sources.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ElementsService } from 'src/app/core/services/elements.service';
import { ElementModel } from 'src/app/core/models/element.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { EntryFormFilter } from './form-entry.util';
import { CreateObservationQueryModel } from 'src/app/core/models/create-observation-query.model';
import { CreateObservationModel } from 'src/app/core/models/create-observation.model';


export type SelectorControlType = 'ELEMENT' | 'YEAR' | 'MONTH' | 'DAY' | 'HOUR' | 'YEARMONTH' | 'DATE';

@Component({
  selector: 'app-form-entry',
  templateUrl: './form-entry.component.html',
  styleUrls: ['./form-entry.component.scss']
})
export class FormEntryComponent implements OnInit {
  protected formMetadata!: EntryForm;
  protected formSelector!: EntryFormFilter;


  protected elements!: ElementModel[];
  protected observations!: CreateObservationModel[];
  protected newObservations!: CreateObservationModel[];

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
      private observationService: ObservationsService,
      private route: ActivatedRoute,
      private location: Location) {

    this.pagesDataService.setPageHeader('Data Entry');
  }

  ngOnInit(): void {
    const stationId = this.route.snapshot.params['stationid'];
    const sourceId = +this.route.snapshot.params['sourceid'];

    this.stationsService.getStationCharacteristics(stationId).subscribe((data) => {
      this.stationName = `${data.id} - ${data.name}`;
    });

    this.sourcesService.getSource(sourceId).subscribe((data) => {
      //set form name
      this.formName = data.name;
      //set form metadata
      if (!data.extraMetadata) {
        // TODO. Throw error?
        return;
      }
      this.formMetadata = JSON.parse(data.extraMetadata);

      this.formSelector = this.getSelectionFilter(stationId, sourceId, this.formMetadata);

      if (this.formSelector.day) {
        this.defaultDateValue = new Date().toISOString().slice(0, 10)
      } else {
        this.defaultDateValue = this.formSelector.year + '-' + StringUtils.addLeadingZero(this.formSelector.month);
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
    if (this.formSelector.elementId) {
      elementsToSearch.push(this.formSelector.elementId);
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
      this.elements = data;
      this.getObservationData();
    });

  }

  private getObservationData(): void {
    //get the data based on the selection filter
    const observationQuery: CreateObservationQueryModel = {
      stationId: this.formSelector.stationId,
      sourceId: this.formSelector.sourceId,
      period: this.formSelector.period,
      //If element is part of the selectors then use the selection, else use form metadata elements
      elementIds: this.formSelector.elementId ? [this.formSelector.elementId] : this.formMetadata.elementIds,
      datetimes: []
    };

    const year = this.formSelector.year;
    const monthIndex = this.formSelector.month - 1;
    const hours = this.formSelector.hour !== undefined ? [this.formSelector.hour] : this.formMetadata.hours;

    if (this.formSelector.day) {
      observationQuery.datetimes = [new Date(year, monthIndex, this.formSelector.day, hours[0], 0, 0, 0).toISOString()];
    } else {
      const lastDay: number = new Date(year, monthIndex, 0).getDate();
      observationQuery.datetimes = [];
      for (let i = 1; i <= lastDay; i++) {
        observationQuery.datetimes.push(new Date(year, monthIndex, i, hours[0], 0, 0, 0).toISOString());
      }
    }


    this.observationService.getObservationsRaw(observationQuery).subscribe((data) => {
      this.observations = data;
    });
  }

  public onElementChange(elementIdInput: number | null): void {
    if (elementIdInput === null) {
      return;
    }
    this.formSelector.elementId = elementIdInput;
    this.loadSelectedElementsAndObservations();
  }

  protected onYearMonthChange(yearMonthInput: string): void {
    const date: Date = new Date(yearMonthInput);
    this.formSelector.year = date.getFullYear();
    this.formSelector.month = date.getMonth() + 1;
    this.loadSelectedElementsAndObservations();
  }

  protected onDateChange(dateInput: string | null): void {
    if (dateInput) {
      const date: Date = new Date(dateInput);
      this.formSelector.year = date.getFullYear();
      this.formSelector.month = date.getMonth() + 1;
      this.formSelector.day = date.getDate();
      this.loadSelectedElementsAndObservations();
    }
  }

  protected onHourChange(hourIdInput: number | null): void {
    if (hourIdInput === null) {
      return;
    }
    this.formSelector.hour = hourIdInput;
    this.loadSelectedElementsAndObservations();
  }

  protected onValueChange(newObservation: CreateObservationModel): void {
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
