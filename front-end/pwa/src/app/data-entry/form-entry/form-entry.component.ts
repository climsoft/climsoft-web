import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { StationsService } from 'src/app/core/services/stations/stations.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils'; 
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { catchError, of, switchMap, take } from 'rxjs';
import { FormEntryDefinition } from './defintions/form-entry.definition';
import { ViewStationModel } from 'src/app/core/models/stations/view-station.model';
import { ObservationDefinition } from './defintions/observation.definition';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { ViewEntryFormModel } from 'src/app/core/models/sources/view-entry-form.model'; 
import { SourcesService } from 'src/app/core/services/sources/sources.service';
import { SameInputStruct } from './assign-same-input/assign-same-input.component';
import { QCTestsService } from 'src/app/core/services/elements/qc-tests.service'; 
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { RangeThresholdQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-params.model';
import { UpdateQCTestModel } from 'src/app/core/models/elements/qc-tests/update-qc-test.model';

@Component({
  selector: 'app-form-entry',
  templateUrl: './form-entry.component.html',
  styleUrls: ['./form-entry.component.scss']
})
export class FormEntryComponent implements OnInit {
  /** Station details */
  protected station!: ViewStationModel;

  /** Source (form) details */
  protected source!: ViewSourceModel;

  /** Definitions used to determine form functionalities */
  protected formDefinitions!: FormEntryDefinition;

  /** Enables or disables save button */
  protected enableSave: boolean = false;

  private totalIsValid!: boolean;

  protected displayHistoryOption: boolean = false;

  protected refreshLayout: boolean = false;

  constructor
    (private pagesDataService: PagesDataService,
      private sourcesService: SourcesService,
      private stationsService: StationsService,
      private observationService: ObservationsService,
      private qcTestsService: QCTestsService,
      private route: ActivatedRoute,
      private location: Location) {
    this.pagesDataService.setPageHeader('Data Entry');
  }

  ngOnInit(): void {
    const stationId = this.route.snapshot.params['stationid'];
    const sourceId = +this.route.snapshot.params['sourceid'];

    // Get station name and switch to form metadata retrieval
    this.stationsService.findOne(stationId).pipe(
      take(1),
      switchMap(stationData => {
        this.station = stationData;
        return this.sourcesService.findOne(sourceId).pipe(take(1));
      })
    ).subscribe(sourceData => {
      this.source = sourceData; 
      // TODO. find a way of correctly chaining this.
      // Get all the range threshold qc's
      this.qcTestsService.findQCTestByType(QCTestTypeEnum.RANGE_THRESHOLD).pipe(take(1)).subscribe(data => {
        const qcTests: UpdateQCTestModel[] = data.filter(item=> (!item.disabled));
        this.formDefinitions = new FormEntryDefinition(this.station, this.source, this.source.parameters as ViewEntryFormModel, qcTests);
        this.loadObservations();
      });

    
    });
  }

  /**
   * Used to determine whether to display element selector 
   */
  protected get displayElementSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('ELEMENT');
  }

  /**
   * Used to determine whether to display date selector
   */
  protected get displayDateSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('DAY');
  }

  /**
   * Used to determine whether to display year-month selector
   */
  protected get displayYearMonthSelector(): boolean {
    return !this.displayDateSelector;
  }

  /**
   * Used to determine whether to display hour selector
   */
  protected get displayHourSelector(): boolean {
    return this.formDefinitions.formMetadata.selectors.includes('HOUR');
  }

  /** Gets default date value (YYYY-MM-DD) used by date selector */
  protected get defaultDateValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Gets default year-month value (YYYY-MM) used by year-month selector
   */
  protected get defaultYearMonthValue(): string {
    return this.formDefinitions.yearSelectorValue + '-' + StringUtils.addLeadingZero(this.formDefinitions.monthSelectorValue);
  }

  protected get utcDifference(): string {
    const utcDiff: number = this.source.utcOffset;
    let strUtcDiff: string = "in";

    if (utcDiff > 0) {
      strUtcDiff = `+${utcDiff}`;
    } else if (utcDiff < 0) {
      strUtcDiff = `-${Math.abs(utcDiff)}`;
    }

    return ` (${strUtcDiff} UTC)`;
  }

  /**
   * Loads any existing observations from the database
   */
  private loadObservations() {
    // Reset controls
    this.totalIsValid = false;
    this.enableSave = false;
    this.refreshLayout = false;

    this.observationService.findRaw(this.formDefinitions.createObservationQuery()).pipe(
      take(1),
      catchError(error => {
        console.error('Failed to load observation data', error);
        return of([]); // TODO. Appropriate fallback needed
      })
    ).subscribe(data => {
      this.formDefinitions.createEntryObsDefs(data);
      this.refreshLayout = true;
    });

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

    this.formDefinitions.elementSelectorValue = id;
    this.loadObservations();
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

    const date: Date = new Date(yearMonth);
    this.formDefinitions.yearSelectorValue = date.getFullYear();
    this.formDefinitions.monthSelectorValue = date.getMonth() + 1;
    this.loadObservations();
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

    const oDate: Date = new Date(strDate);
    this.formDefinitions.yearSelectorValue = oDate.getFullYear();
    this.formDefinitions.monthSelectorValue = oDate.getMonth() + 1;
    this.formDefinitions.daySelectorValue = oDate.getDate();
    this.loadObservations();

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

    this.formDefinitions.hourSelectorValue = hour;
    this.loadObservations();
  }

  /**
 * Handles changes in observation definitions by updating the internal state and
 * managing the ability to save based on the validity of changes.
 * 
 * @param observationDef The observation definition object to be processed.
 */
  protected onValueChange(observationDef: ObservationDefinition): void {
    // Determine the ability to save based on whether any observation changes a
    this.enableOrDisableSave();
  }

  /**
   * Handles validation of total input from the layouts
   * @param totalIsValid 
   */
  protected onTotalIsValid(totalIsValid: boolean) {
    this.totalIsValid = totalIsValid;
    this.enableOrDisableSave();
  }

  /**
   * Determine the ability to save based on whether there are changes and all observation changes are valid
   */
  private enableOrDisableSave(): void {
    if (!this.formDefinitions) {
      this.enableSave = false;
      return;
    }

    // Set total as valid, because everything has been cleared
    if (this.formDefinitions.formMetadata.requireTotalInput && !this.totalIsValid) {
      this.enableSave = false;
      return;
    }

    for (const obsDef of this.formDefinitions.allObsDefs) {
      // Check for change validit 
      if (!obsDef.observationChangeIsValid) {
        this.enableSave = false;
        return;
      }
    }

    this.enableSave = true;
  }


  /**
   * Updates its internal state depending on the options passed
   * @param option  'Clear' | 'History'
   */
  protected onOptions(option: 'Same Input' | 'Clear Input' | 'Show History'): void {
    switch (option) {
      case 'Clear Input':
        this.clear();
        break;
      case 'Show History':
        this.displayHistoryOption = !this.displayHistoryOption;
        break;
    }
  }

  protected assignSameValue(input: SameInputStruct): void {
    for (const obsDef of this.formDefinitions.allObsDefs) {
      // Check if value flag is empty
      if (StringUtils.isNullOrEmpty(obsDef.valueFlagForDisplay)) {
        // Set the new the value flag input
        obsDef.updateValueFlagFromUserInput(input.valueFlag); 
        obsDef.updateCommentInput(input.comment);
      }

    }

    this.enableOrDisableSave();
  }

  /**
  * Clears all the observation value fflags if they are not cleared and updates its internal state
  */
  private clear(): void {
    for (const obsDef of this.formDefinitions.allObsDefs) {
      // Clear the value flag input
      obsDef.updateValueFlagFromUserInput('');
      obsDef.updateCommentInput('');
    }

    this.enableOrDisableSave();
  }


  /**
   * Handles saving of observations by sending the data to the server and updating intenal state
   */
  protected onSave(): void {
    // Important, disable the save button. Useful for waiting the save results.
    this.enableSave = false;

    // Create required observation dtos 
    const newObservations: CreateObservationModel[] = this.formDefinitions.allObsDefs.filter(item => item.observationChanged).map(item => item.observation);

    if (newObservations.length === 0) {
      this.pagesDataService.showToast({ title: 'Observations', message: `No changes made`, type: 'info' });
      return;
    }

    // Send to server for saving
    this.observationService.save(newObservations).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${newObservations.length} observation${newObservations.length === 1 ? '' : 's'} saved`, type: 'success'
        });

        this.loadObservations();
      } else {
        this.pagesDataService.showToast({
          title: 'Observations', message: `${newObservations.length} observation${newObservations.length === 1 ? '' : 's'} NOT saved`, type: 'error'
        });
      }
    });
  }

  /**
   * Handles cancel event and routes the application back to previous route page
   */
  protected onCancel(): void {
    this.location.back();
  }


}
