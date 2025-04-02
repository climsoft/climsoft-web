import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { CreateObservationModel } from 'src/app/data-ingestion/models/create-observation.model';
import { EMPTY, map, Subject, switchMap, take, takeUntil } from 'rxjs';
import { FormEntryDefinition } from './defintitions/form-entry.definition';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { ViewEntryFormModel } from 'src/app/metadata/source-templates/models/view-entry-form.model';
import { SameInputStruct } from './assign-same-input/assign-same-input.component';
import { ElementsQCTestsService } from 'src/app/metadata/elements/services/elements-qc-tests.service';
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { ViewElementQCTestModel } from 'src/app/core/models/elements/qc-tests/view-element-qc-test.model';
import { SourceTemplatesCacheService } from 'src/app/metadata/source-templates/services/source-templates-cache.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { DEFAULT_USER_FORM_SETTINGS, USER_FORM_SETTING_STORAGE_NAME, UserFormSettingStruct } from './user-form-settings/user-form-settings.component';
import { LocalStorageService } from 'src/app/shared/services/local-storage.service';
import { FindQCTestQueryModel } from 'src/app/metadata/elements/models/find-qc-test-query.model';
import { ObservationDefinition } from './defintitions/observation.definition';
import { LnearLayoutComponent } from './linear-layout/linear-layout.component';
import { GridLayoutComponent } from './grid-layout/grid-layout.component';
import { ObservationsService } from '../services/observations.service';

@Component({
  selector: 'app-form-entry',
  templateUrl: './form-entry.component.html',
  styleUrls: ['./form-entry.component.scss']
})
export class FormEntryComponent implements OnInit, OnDestroy {
  @ViewChild('appLinearLayout') linearLayoutComponent!: LnearLayoutComponent;
  @ViewChild('appGridLayout') gridLayoutComponent!: GridLayoutComponent;
  @ViewChild('saveButton') saveButton!: ElementRef;

  /** Station details */
  protected station!: StationCacheModel;

  /** Source (form) details */
  protected source!: ViewSourceModel;

  /** Definitions used to determine form functionalities */
  protected formDefinitions!: FormEntryDefinition;

  private totalIsValid!: boolean;

  protected displayExtraInfoOption: boolean = false;

  protected refreshLayout: boolean = false;

  protected openSameInputDialog: boolean = false;
  protected openUserFormSettingsDialog: boolean = false;

  protected defaultYearMonthValue!: string;
  protected defaultDateValue!: string;

  protected userFormSettings: UserFormSettingStruct;

  private destroy$ = new Subject<void>();

  constructor
    (private pagesDataService: PagesDataService,
      private sourcesService: SourceTemplatesCacheService,
      private stationsService: StationsCacheService,
      private observationService: ObservationsService,
      private qcTestsService: ElementsQCTestsService,
      private route: ActivatedRoute,
      private location: Location,
      private localStorage: LocalStorageService,) {
    this.pagesDataService.setPageHeader('Data Entry');

    //Set user form settings
    const savedUserFormSetting = this.localStorage.getItem<UserFormSettingStruct>(USER_FORM_SETTING_STORAGE_NAME);
    this.userFormSettings = savedUserFormSetting ? savedUserFormSetting : { ...DEFAULT_USER_FORM_SETTINGS }; // pass by value. Important
  }

  ngOnInit(): void {
    const stationId = this.route.snapshot.params['stationid'];
    const sourceId = +this.route.snapshot.params['sourceid'];

    this.stationsService.findOne(stationId).pipe(
      takeUntil(this.destroy$),
      switchMap(stationData => {
        if (!stationData) {
          // Return empty if no station data
          return EMPTY;
        }

        this.station = stationData;

        // Get source data
        return this.sourcesService.findOne(sourceId).pipe(
          takeUntil(this.destroy$),
          switchMap(sourceData => {
            if (!sourceData) {
              // Return empty array if no source data or station data
              return EMPTY;
            }
            this.source = sourceData;

            const sourceParams = this.source.parameters as ViewEntryFormModel;
            const findQCTestQuery: FindQCTestQueryModel = {
              elementIds: sourceParams.elementIds,
              qcTestTypes: [QCTestTypeEnum.RANGE_THRESHOLD],
              observationPeriod: sourceParams.interval,
            };

            // Get quality control tests
            return this.qcTestsService.find(findQCTestQuery).pipe(
              takeUntil(this.destroy$),
              map(test => test.filter(item => !item.disabled))
            );
          })
        );
      })
    ).subscribe({
      next: (qcTests: ViewElementQCTestModel[]) => {
        if (!this.station || !this.source) {
          console.warn('Station or Source is missing.');
          // TODO. Display a message or take some other action
          return;
        }

        // Note, as of 09/01/2025, when user is online this will be raised twice due to the qc test service that finds the qc twice, locally and from server

        this.formDefinitions = new FormEntryDefinition(
          this.station,
          this.source,
          this.source.parameters as ViewEntryFormModel,
          qcTests
        );
        this.loadObservations();

        /** Gets default date value (YYYY-MM-DD) used by date selector */
        const date: Date = new Date()
        this.defaultDateValue = `${date.getFullYear()}-${StringUtils.addLeadingZero(date.getMonth() + 1)}-${StringUtils.addLeadingZero(date.getDate())}`;

        // Gets default year-month value (YYYY-MM) used by year-month selector
        this.defaultYearMonthValue =
          `${this.formDefinitions.yearSelectorValue}-${StringUtils.addLeadingZero(this.formDefinitions.monthSelectorValue)}`;
      },
      error: err => {
        console.error(err);
        // TODO. Display feedback to the user
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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

  protected get utcOffset(): string {
    const utcOffset: number = this.source.utcOffset;
    let strUtcDiff: string = "in";

    if (utcOffset > 0) {
      strUtcDiff = `+${utcOffset}`;
    } else if (utcOffset < 0) {
      strUtcDiff = `${utcOffset}`;
    }

    //return `(${strUtcDiff} UTC)`;
    return '';
  }

  /**
   * Loads any existing observations from the database
   */
  private loadObservations(): void {
    // Reset controls
    this.totalIsValid = false;
    this.refreshLayout = false;
    this.changedObsDefs = [];
    this.observationService.findEntryFormData(this.formDefinitions.createObservationQuery()).pipe(
      take(1),
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
    if (!yearMonth) {
      return;
    }
    const splitValue = yearMonth.split('-');
    this.formDefinitions.yearSelectorValue = +splitValue[0];
    this.formDefinitions.monthSelectorValue = +splitValue[1];
    this.loadObservations();
  }

  /**
   * Handles changes in year, month and day selection by updating internal state
   * @param strDate 
   * @returns 
   */
  protected onDateChange(strDate: string | null): void {
    if (!strDate) {
      return;
    }
    const splitValue = strDate.split('-');
    this.formDefinitions.yearSelectorValue = +splitValue[0];
    this.formDefinitions.monthSelectorValue = +splitValue[1];
    this.formDefinitions.daySelectorValue = +splitValue[2];
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
   * Handles validation of total input from the layouts
   * @param totalIsValid 
   */
  protected onTotalIsValid(totalIsValid: boolean) {
    this.totalIsValid = totalIsValid;
  }

  /**
   * Updates its internal state depending on the options passed
   * @param option  'Same Input' | 'Clear Input' | 'Add Extra Info' | 'Settings'
   */
  protected onOptions(option: 'Same Input' | 'Clear Fields' | 'Extra Info' | 'Settings'): void {
    switch (option) {
      case 'Same Input':
        this.openSameInputDialog = true;
        break;
      case 'Clear Fields':
        this.clear();
        break;
      case 'Extra Info':
        this.displayExtraInfoOption = !this.displayExtraInfoOption;
        break;
      case 'Settings':
        this.openUserFormSettingsDialog = true;
        break;
    }
  }

  /**
   * Sets the same value flag to all entry fields
   * @param input 
   */
  protected onAssignSameValue(input: SameInputStruct): void {
    for (const obsDef of this.formDefinitions.allObsDefs) {
      // Check if value flag is empty
      if (StringUtils.isNullOrEmpty(obsDef.getvalueFlagForDisplay())) {
        // Set the new the value flag input
        obsDef.updateValueFlagFromUserInput(input.valueFlag);
        obsDef.updateCommentInput(input.comment);
      }
    }

    if (this.linearLayoutComponent) {
      this.linearLayoutComponent.sameInput(input.valueFlag, input.comment);
    }

    if (this.gridLayoutComponent) {
      this.gridLayoutComponent.sameInput(input.valueFlag, input.comment);
    }

  }

  /**
  * Clears all the observation value flags if they are not cleared and updates its internal state
  */
  private clear(): void {
    // for (const obsDef of this.formDefinitions.allObsDefs) {
    //   // Clear the value flag input
    //   obsDef.updateValueFlagFromUserInput('');
    //   obsDef.updateCommentInput('');
    //   obsDef.updatePeriodInput(this.formDefinitions.formMetadata.period);

    // };

    if (this.linearLayoutComponent) {
      this.linearLayoutComponent.clear();
    }

    if (this.gridLayoutComponent) {
      this.gridLayoutComponent.clear();
    }
  }

  protected onUserFormSettingsChange(userFormSettings: UserFormSettingStruct): void {
    const savedUserFormSetting = this.localStorage.getItem<UserFormSettingStruct>(USER_FORM_SETTING_STORAGE_NAME);
    if (savedUserFormSetting) {
      this.userFormSettings = savedUserFormSetting
    }
  }

  /**
   * Handles saving of observations by sending the data to the server and updating intenal state
   */
  protected onSave(): void {
    //console.log('save clicked');
    // Get observations that have changes and have either value or flag, that is, ignore blanks or unchanged values.
    const savableObservations: CreateObservationModel[] | null = this.checkValidityAndGetChanges();
    //console.log('saving: ',  newObservations)
    if (savableObservations === null) return;

    for (const observation of savableObservations) {
      // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
      // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it
      observation.datetime = this.formDefinitions.getDatetimesBasedOnUTCOffset(observation.datetime, 'subtract');
      console.log('saving: ', observation.datetime)
    }
    // Send to server for saving
    this.observationService.bulkPutDataFromEntryForm(savableObservations).pipe(take(1)).subscribe((response) => {
      let type: ToastEventTypeEnum;
      if (response.includes('error')) {
        type = ToastEventTypeEnum.ERROR;
      } else if (response.includes('local')) {
        type = ToastEventTypeEnum.WARNING;
      } else if (response.includes('success')) {
        type = ToastEventTypeEnum.SUCCESS;
      } else {
        type = ToastEventTypeEnum.INFO;
      }

      this.pagesDataService.showToast({ title: 'Observations', message: response, type: type });

      if (type !== ToastEventTypeEnum.ERROR) {
        if (this.userFormSettings.incrementDateSelector) {
          this.sequenceToNextDate();
        }
        this.loadObservations();
      }
    });

  }

  /**
   * Determine the ability to save based on whether there are changes and all observation changes are valid
   * @returns 
   */
  private checkValidityAndGetChanges(): CreateObservationModel[] | null {
    if (!this.formDefinitions) {
      this.pagesDataService.showToast({ title: 'Observations', message: `Form parameters not set`, type: ToastEventTypeEnum.ERROR });
      return null;
    }

    // Set total as valid, because everything has been cleared
    if (this.formDefinitions.formMetadata.requireTotalInput && !this.totalIsValid) {
      this.pagesDataService.showToast({ title: 'Observations', message: `Total value not entered`, type: ToastEventTypeEnum.ERROR });
      return null;
    }

    const newObservations: CreateObservationModel[] = [];

    // CODE BLOCK THAT HAS THE BUG THAT ENFORCED USING EXPLICIT EVENT COMMUNICATION
    //----------------------------------------
    // for (const obsDef of this.formDefinitions.allObsDefs) {
    //   // Check for change validity
    //   if (!obsDef.observationChangeIsValid) {
    //     this.pagesDataService.showToast({ title: 'Observations', message: `Invalid value detected`, type: ToastEventTypeEnum.ERROR });
    //     return null;
    //   }

    //   //SERIOUS BUG THAT INVOLVES OBJECTS SOMEHOW NOT BEING PASSED BY REFERENCE. SOMETIMES IT DOESN'T HAPPEN
    //   //----------------------------------------
    //   // Get observations that have changes and have either value or flag, that is, ignore blanks or unchanged values.
    //   if (obsDef.observationChanged && (obsDef.observation.value !== null || obsDef.observation.flag !== null)) {
    //     newObservations.push(obsDef.observation);
    //   }

    // }
    //----------------------------------------

    for (const obsDef of this.changedObsDefs) {
      // Check for change validity
      if (!obsDef.observationChangeIsValid) {
        this.pagesDataService.showToast({ title: 'Observations', message: `Invalid value detected`, type: ToastEventTypeEnum.ERROR });
        return null;
      }

      // Get observations that have either value or flag, that is, ignore blanks
      if (obsDef.observation.value !== null || obsDef.observation.flag !== null) {
        newObservations.push(obsDef.observation);
      }

    }

    if (newObservations.length === 0) {
      this.pagesDataService.showToast({ title: 'Observations', message: `No changes made`, type: ToastEventTypeEnum.ERROR });
      return null;
    }

    return newObservations;
  }

  private sequenceToNextDate(): void {
    const currentYearValue: number = this.formDefinitions.yearSelectorValue;
    const currentMonthValue: number = this.formDefinitions.monthSelectorValue; // 1-indexed (January = 1)
    const today = new Date();

    let newYear = currentYearValue;
    let newMonth = currentMonthValue;
    let newDay: number | null = null;

    if (this.formDefinitions.daySelectorValue) {
      let currentDayValue = this.formDefinitions.daySelectorValue;

      const daysInMonth = new Date(newYear, newMonth, 0).getDate(); // Get days in the current month
      if (currentDayValue < daysInMonth) {
        newDay = currentDayValue + 1; // Sequence to the next day
      } else {
        // If it's the last day of the month, sequence to the first day of the next month
        newDay = 1;
        if (newMonth < 12) {
          newMonth++;
        } else {
          // If it's December, sequence to January of the next year
          newMonth = 1;
          newYear++;
        }
      }
    } else {
      // If daySelectorValue is not defined, sequence to the next month
      if (newMonth < 12) {
        newMonth++;
      } else {
        // If it's December, sequence to January of the next year
        newMonth = 1;
        newYear++;
      }
    }

    // Ensure sequencing does not exceed the current date
    const newDate = new Date(newYear, newMonth - 1, newDay || 1); // Use 1 if no day is specified
    if (newDate > today) {
      console.warn("Sequencing exceeds the current date. No changes applied.");
      return;
    }

    // Update the form definitions with the sequenced values
    this.formDefinitions.yearSelectorValue = newYear;
    this.formDefinitions.monthSelectorValue = newMonth;
    if (newDay !== null) {
      this.formDefinitions.daySelectorValue = newDay;
      /** Gets default date value (YYYY-MM-DD) used by date selector */
      this.defaultDateValue = this.formDefinitions.yearSelectorValue + '-' + StringUtils.addLeadingZero(this.formDefinitions.monthSelectorValue) + '-' + StringUtils.addLeadingZero(this.formDefinitions.daySelectorValue);
    }

    // Gets default year-month value (YYYY-MM) used by year-month selector
    this.defaultYearMonthValue = this.formDefinitions.yearSelectorValue + '-' + StringUtils.addLeadingZero(this.formDefinitions.monthSelectorValue);
  }

  /**
   * Handles cancel event and routes the application back to previous route page
   */
  protected onCancel(): void {
    this.location.back();
  }

  protected changedObsDefs: ObservationDefinition[] = [];

  // Important note, this explicit event communication between components was adopted because inconsistent behavior was observed 
  // when using mutable updates to nested objects, in this case the observation object that is part of the obdervation definition object, 
  // this likely stems from Angular's reliance on object references for change detection.
  protected onUserInputVF(obsDef: ObservationDefinition) {
    const obsDefIndex: number = this.changedObsDefs.findIndex(item => item === obsDef);
    if (obsDefIndex > -1) {
      this.changedObsDefs.splice(obsDefIndex, 1);
    }

    // Ignore unchanged values
    if (obsDef.observationChanged) {
      this.changedObsDefs.push(obsDef);
    }
  }

  protected onFocusSaveButton(): void {
    // Focusing the save button immediately has a bug of raising a click event immediately thus saving the contents even though its just a focus
    // This timeout is hacky way of solving the problem. 
    // TODO investigate why the above happens
    //console.log('save before focus');
    // this.saveButton.nativeElement.focus();
    //console.log('save after focus');
    setTimeout(() => {
      this.saveButton.nativeElement.focus();
    }, 0);

  }

}
