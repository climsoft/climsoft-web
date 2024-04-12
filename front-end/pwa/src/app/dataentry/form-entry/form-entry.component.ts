import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ObservationsService } from 'src/app/core/services/observations.service';
import { SourcesService } from 'src/app/core/services/sources.service';
import { StationsService } from 'src/app/core/services/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ElementsService } from 'src/app/core/services/elements.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { CreateObservationQueryModel } from 'src/app/core/models/create-observation-query.model';
import { CreateObservationModel } from 'src/app/core/models/create-observation.model';
import { catchError, of, switchMap, take } from 'rxjs';
import { EntryFormDefinition } from './form-entry.definition';

/** Types of selector controls allowed */
//export type SelectorControlType = 'ELEMENT' | 'YEAR' | 'MONTH' | 'DAY' | 'HOUR' | 'YEARMONTH' | 'DATE';

@Component({
  selector: 'app-form-entry',
  templateUrl: './form-entry.component.html',
  styleUrls: ['./form-entry.component.scss']
})
export class FormEntryComponent implements OnInit {
  /** Name of station */
  protected stationName!: string;

  /** Name of form */
  protected formName!: string;

  /** Definitions used to determine form functionality */
  protected formDefinitions!: EntryFormDefinition;


  /** Enables or disables save button */
  protected enableSave: boolean = false;



  /** Observations retrieved from database */
  protected dbObservations!: CreateObservationModel[];

  protected newObservations!: CreateObservationModel[];

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

    this.stationsService.getStationCharacteristics(stationId).pipe(
      take(1)
    ).subscribe((data) => {
      this.stationName = `${data.id} - ${data.name}`;
    });

    this.sourcesService.getSource(sourceId).pipe(
      take(1)
    ).subscribe((data) => {
      //set form name
      this.formName = data.name;
      //set form metadata
      if (!data.extraMetadata) {
        // TODO. Throw error?
        return;
      }

      //the load existing observation data
      this.formDefinitions = new EntryFormDefinition(stationId, sourceId, JSON.parse(data.extraMetadata));
      this.loadObservations();

    });

  }

  protected get displayElementSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('ELEMENT');
  }

  protected get displayDateSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('DAY');
  }

  protected get displayYearMonthSelector(): boolean {
    return !this.displayDateSelector;
  }

  protected get displayHourSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('HOUR');
  }

  protected get defaultDateValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  protected get defaultYearMonthValue(): string {
    return this.formDefinitions.yearSelectorValue + '-' + StringUtils.addLeadingZero(this.formDefinitions.monthSelectorValue);
  }

  private loadObservations() {

    this.formDefinitions.elements = [];
    this.dbObservations = [];
    this.newObservations = [];

    // Note, its not expected that all elements in the database will be set as entry fields. 
    // that should be regarded as an error in form builder design.
    // so always assume that elements selected are provided
    // Fetch the elements first then their observations
    this.elementsService.getElements(this.formDefinitions.elementValuesForDBQuerying).pipe(
      take(1),
      switchMap(data => {
        this.formDefinitions.elements = data;
        return this.observationService.getObservationsRaw(this.createObservationQuery(this.formDefinitions)).pipe(take(1));
      }),
      catchError(error => {
        console.error('Failed to load data', error);
        return of([]); // TODO. Appropriate fallback needed
      })
    ).subscribe(data => {
      this.dbObservations = data;
    });

  }


  private createObservationQuery(formDefinitions: EntryFormDefinition): CreateObservationQueryModel {
    //get the data based on the selection filter
    const observationQuery: CreateObservationQueryModel = {
      stationId: formDefinitions.stationId,
      sourceId: formDefinitions.sourceId,
      period: formDefinitions.formMetadata.period,
      elementIds: formDefinitions.elementValuesForDBQuerying,
      datetimes: []
    };

    const year = formDefinitions.yearSelectorValue;
    const monthIndex = formDefinitions.monthSelectorValue - 1;
    const hours = formDefinitions.hourValuesForDBQuerying

    if (formDefinitions.daySelectorValue) {
      observationQuery.datetimes = [new Date(year, monthIndex, formDefinitions.daySelectorValue, hours[0], 0, 0, 0).toISOString()];
    } else {
      const lastDay: number = new Date(year, monthIndex, 0).getDate();
      observationQuery.datetimes = [];
      for (let i = 1; i <= lastDay; i++) {
        observationQuery.datetimes.push(new Date(year, monthIndex, i, hours[0], 0, 0, 0).toISOString());
      }
    }
    return observationQuery;
  }

  public onElementChange(elementIdInput: number | null): void {
    if (elementIdInput === null) {
      return;
    }
    this.formDefinitions.elementSelectorValue = elementIdInput;
    this.loadObservations();
  }

  protected onYearMonthChange(yearMonthInput: string | null): void {
    if (yearMonthInput === null) {
      return;
    }

    const date: Date = new Date(yearMonthInput);
    this.formDefinitions.yearSelectorValue = date.getFullYear();
    this.formDefinitions.monthSelectorValue = date.getMonth() + 1;
    this.loadObservations();
  }

  protected onDateChange(dateInput: string | null): void {
    if (dateInput === null) {
      return;
    }
    const date: Date = new Date(dateInput);
    this.formDefinitions.yearSelectorValue = date.getFullYear();
    this.formDefinitions.monthSelectorValue = date.getMonth() + 1;
    this.formDefinitions.daySelectorValue = date.getDate();
    this.loadObservations();

  }

  protected onHourChange(hourIdInput: number | null): void {
    if (hourIdInput === null) {
      return;
    }
    this.formDefinitions.hourSelectorValue = hourIdInput;
    this.loadObservations();
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

      this.loadObservations();

    });
  }

  protected onCancelClick(): void {
    this.location.back();
  }


}
