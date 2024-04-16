import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ObservationsService } from 'src/app/core/services/observations/observations.service'; 
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service'; 
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { CreateObservationQueryModel } from 'src/app/core/models/observations/create-observation-query.model';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { catchError, of, take } from 'rxjs';
import { FormEntryDefinition } from './defintions/form-entry.definition';
import { FormSourcesService } from 'src/app/core/services/sources/form-sources.service';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';

@Component({
  selector: 'app-form-entry',
  templateUrl: './form-entry.component.html',
  styleUrls: ['./form-entry.component.scss']
})
export class FormEntryComponent implements OnInit {
  /** Name of station */
  protected station!: ViewStationModel;

   /** Name of form */
  protected formName!: string;

  /** Definitions used to determine form functionalities */
  protected formDefinitions!: FormEntryDefinition;

  /** Enables or disables save button */
  protected enableSave: boolean = false;

  /** Observations retrieved from database */
  protected dbObservations!: CreateObservationModel[];

  /** Observations entered */
  protected newObservations!: CreateObservationModel[];

  constructor
    (private pagesDataService: PagesDataService,
      private formSourcesService: FormSourcesService,
      private stationsService: StationsService,
      private observationService: ObservationsService,
      private route: ActivatedRoute,
      private location: Location) {

    this.pagesDataService.setPageHeader('Data Entry');
  }

  ngOnInit(): void {
    const stationId = this.route.snapshot.params['stationid'];
    const sourceId = +this.route.snapshot.params['sourceid'];

    // Get station name 
    this.stationsService.getStationCharacteristics(stationId).pipe(
      take(1)
    ).subscribe(data => {
      this.station = data;
    });

    // Get form metadata
    this.formSourcesService.find(sourceId).pipe(
      take(1)
    ).subscribe((data) => {
     
      if (!data.extraMetadata) {
        // TODO. Throw error?
        return;
      }

      // Set form name
      this.formName = data.name

      // Define initial definition
      this.formDefinitions = new FormEntryDefinition(this.station, sourceId, data.extraMetadata);
     
      // Load existing observation data
      this.loadObservations();

    });

  }

  /** Used to determine whether to display element selector */
  protected get displayElementSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('ELEMENT');
  }

   /** Used to determine whether to display date selector */
  protected get displayDateSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('DAY');
  }

   /** Used to determine whether to display year-month selector */
  protected get displayYearMonthSelector(): boolean {
    return !this.displayDateSelector;
  }

   /** Used to determine whether to display hour selector */
  protected get displayHourSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('HOUR');
  }

   /** Gets default date value (YYYY-MM-DD) used by date selector */
  protected get defaultDateValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

   /** Gets default year-month value (YYYY-MM) used by year-month selector */
  protected get defaultYearMonthValue(): string {
    return this.formDefinitions.yearSelectorValue + '-' + StringUtils.addLeadingZero(this.formDefinitions.monthSelectorValue);
  }

  /** Loads any existing observations from the database */
  private loadObservations() {

    this.dbObservations = [];
    this.newObservations = [];
    this.formDefinitions.dbObservations = [];

    this.observationService.findRaw(this.createObservationQuery(this.formDefinitions)).pipe(
      take(1),
      catchError(error => {
        console.error('Failed to load observation data', error);
        return of([]); // TODO. Appropriate fallback needed
      })
    ).subscribe(data => {
      this.dbObservations = data;
      this.formDefinitions.dbObservations = data;
    });

  }

  /** Creates the observation query object for loading existing observations from the database */
  private createObservationQuery(formDefinitions: FormEntryDefinition): CreateObservationQueryModel {
    //get the data based on the selection filter
    const observationQuery: CreateObservationQueryModel = {
      stationId: formDefinitions.station.id,
      sourceId: formDefinitions.sourceId,
      period: formDefinitions.formMetadata.period,
      elementIds: formDefinitions.elementValuesForDBQuerying,
      datetimes: []
    };

    const year = formDefinitions.yearSelectorValue;
    const monthIndex = formDefinitions.monthSelectorValue - 1;
    const hours = formDefinitions.hourValuesForDBQuerying

    // If day value is defined then just define a single data time else define all date times for the entire month
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

  /** Event handler for element selector */
  public onElementChange(id: number | null): void {
    if (id === null) {
      return;
    }
    this.formDefinitions.elementSelectorValue = id;
    this.loadObservations();
  }

    /** Event handler for year month selector */
  protected onYearMonthChange(yearMonth: string | null): void {
    if (yearMonth === null) {
      return;
    }

    const date: Date = new Date(yearMonth);
    this.formDefinitions.yearSelectorValue = date.getFullYear();
    this.formDefinitions.monthSelectorValue = date.getMonth() + 1;
    this.loadObservations();
  }

    /** Event handler for date selector */
  protected onDateChange(strDate: string | null): void {
    if (strDate === null) {
      return;
    }
    const oDate: Date = new Date(strDate);
    this.formDefinitions.yearSelectorValue = oDate.getFullYear();
    this.formDefinitions.monthSelectorValue = oDate.getMonth() + 1;
    this.formDefinitions.daySelectorValue = oDate.getDate();
    this.loadObservations();

  }

    /** Event handler for hour selector */
  protected onHourChange(hour: number | null): void {
    if (hour === null) {
      return;
    }
    this.formDefinitions.hourSelectorValue = hour;
    this.loadObservations();
  }

    /** Event handler for observation entry controls */
  protected onObservationEntry(newObservation: CreateObservationModel): void {
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

    /** Event handler for save button */
  protected onSaveClick(): void {
    this.enableSave = false;
    this.observationService.save(this.newObservations).subscribe((data) => {

      this.pagesDataService.showToast({
        title: 'Observations', message: `${data.length} observation${data.length === 1 ? '' : 's'} saved`, type: 'success'
      });

      this.loadObservations();

    });
  }

  protected onDeleteClick(): void {
    this.location.back();
  }

    /** Event handler for cancel button */
  protected onCancelClick(): void {
    this.location.back();
  }


}
