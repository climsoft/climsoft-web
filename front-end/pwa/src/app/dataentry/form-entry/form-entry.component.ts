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
import { ObservationDefinition } from './defintions/observation.definition';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { ViewEntryFormModel } from 'src/app/core/models/sources/view-entry-form.model';

@Component({
  selector: 'app-form-entry',
  templateUrl: './form-entry.component.html',
  styleUrls: ['./form-entry.component.scss']
})
export class FormEntryComponent implements OnInit {
  /** Station details */
  protected station!: ViewStationModel;
  
  /** Source (form) details */
  protected source!: ViewSourceModel<ViewEntryFormModel>;

  /** Definitions used to determine form functionalities */
  protected formDefinitions!: FormEntryDefinition;

  /** Enables or disables save button */
  protected enableSave: boolean = true;

  protected clearValues: boolean = false;

  /** Observations entered */
  protected newObservationDefs!: ObservationDefinition[];

  private totalIsValid!: boolean;

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

      // Set source
      this.source = data

      // Load existing observation data
      this.loadObservations(this.getNewFormDefinition());

    });

  }

  private getNewFormDefinition() {
    if (!this.source.extraMetadata) {
      // TODO. Throw error?
      throw new Error('Developer error. Source does not have entry form metadata')

    }
    return new FormEntryDefinition(this.station, this.source.id, this.source.extraMetadata);
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
  private loadObservations(newFormDefinitions: FormEntryDefinition) {

    this.newObservationDefs = [];
    this.totalIsValid = newFormDefinitions.formMetadata.validateTotal ? false : true;
    this.enableOrDisableSave();

    this.observationService.findRaw(this.createObservationQuery(newFormDefinitions)).pipe(
      take(1),
      catchError(error => {
        console.error('Failed to load observation data', error);
        return of([]); // TODO. Appropriate fallback needed
      })
    ).subscribe(data => {
      // Set the new definitions to be used by the component
      newFormDefinitions.dbObservations = data;
      this.formDefinitions = newFormDefinitions;
    });

  }

  /**
   * Creates the observation query object for getting existing observations from the database.
   * @param formDefinitions form defintions to use in creating the observation query dto.
   * @returns 
   */
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

  /**
   * Handles changes in element selection by updating internal state
   * @param id 
   * @returns 
   */
  public onElementChange(id: number | null): void {
    if (id === null) {
      return;
    }
    const newFormDefinitions = this.getNewFormDefinition();
    newFormDefinitions.elementSelectorValue = id;
    this.loadObservations(newFormDefinitions);
  }

  /**
   * Handles changes in year and month selection by updating internal state
   * @param yearMonth 
   * @returns 
   */
  protected onYearMonthChange(yearMonth: string | null): void {
    if (yearMonth === null) {
      return;
    }

    const newFormDefinitions = this.getNewFormDefinition();
    const date: Date = new Date(yearMonth);
    newFormDefinitions.yearSelectorValue = date.getFullYear();
    newFormDefinitions.monthSelectorValue = date.getMonth() + 1;
    this.loadObservations(newFormDefinitions);
  }

  /**
   * Handles changes in year, month and day selection by updating internal state
   * @param strDate 
   * @returns 
   */
  protected onDateChange(strDate: string | null): void {
    if (strDate === null) {
      return;
    }

    const newFormDefinitions = this.getNewFormDefinition();
    const oDate: Date = new Date(strDate);
    newFormDefinitions.yearSelectorValue = oDate.getFullYear();
    newFormDefinitions.monthSelectorValue = oDate.getMonth() + 1;
    newFormDefinitions.daySelectorValue = oDate.getDate();
    this.loadObservations(newFormDefinitions);

  }

  /**
   * Handles changes in hour selection by updating internal state
   * @param hour 
   * @returns 
   */
  protected onHourChange(hour: number | null): void {
    if (hour === null) {
      return;
    }
    const newFormDefinitions = this.getNewFormDefinition();
    newFormDefinitions.hourSelectorValue = hour;
    this.loadObservations(newFormDefinitions);
  }

  /**
 * Handles changes in observation definitions by updating the internal state and
 * managing the ability to save based on the validity of changes.
 * 
 * @param observationDef The observation definition object to be processed.
 */
  protected onValueChange(observationDef: ObservationDefinition): void {
    // Update or add the observation definition in the list
    const index = this.newObservationDefs.findIndex(data => data === observationDef);
    if (index !== -1) {
      // Update the existing observation definition if found
      this.newObservationDefs[index] = observationDef;
    } else {
      // Add a new observation definition if not found
      this.newObservationDefs.push(observationDef);
    }

    // Determine the ability to save based on whether any observation changes a
    this.enableOrDisableSave();
  }

  protected onTotalIsValid(totalIsValid: boolean) {
    this.totalIsValid = totalIsValid;
    this.enableOrDisableSave();
  }

  /**
   * Determine the ability to save based on whether there are changes and all observation changes are valid
   */
  private enableOrDisableSave(): void {
    this.enableSave = this.totalIsValid && this.newObservationDefs.length > 0 && !this.newObservationDefs.some(data => !data.observationChangeIsValid);
  }


  /**
   * Handles saving of observations by sending the data to the server and updating intenal state
   */
  protected onSaveClick(): void {

    const newObservations: CreateObservationModel[] = this.newObservationDefs.map(item => (item.observation))
    this.observationService.save(newObservations).subscribe((data) => {

      this.pagesDataService.showToast({
        title: 'Observations', message: `${data.length} observation${data.length === 1 ? '' : 's'} saved`, type: 'success'
      });

      this.loadObservations(this.formDefinitions);

    });
  }

  /**
   * Clears all observations values and updates the internal state
   */
  protected onClearClick(): void {
   
    this.clearValues = true;
    console.log('clear clicked',   this.clearValues)
    this.enableOrDisableSave();
    this.clearValues = false;
  }

  /** Event handler for cancel button */
  protected onCancelClick(): void {
    this.location.back();
  }


}
