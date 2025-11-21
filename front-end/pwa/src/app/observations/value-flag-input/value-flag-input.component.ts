import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ObservationDefinition } from '../../data-ingestion/form-entry/defintitions/observation.definition';
import { TextInputComponent } from 'src/app/shared/controls/text-input/text-input.component';
import { ObservationsService } from '../../data-ingestion/services/observations.service';
import { ViewObservationLogModel } from 'src/app/data-ingestion/models/view-observation-log.model';
import { ViewObservationModel, ViewQCTestLog } from 'src/app/data-ingestion/models/view-observation.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { StringUtils } from 'src/app/shared/utils/string.utils';

/**
 * Component for data entry of observations
 */

@Component({
  selector: 'app-value-flag-input',
  templateUrl: './value-flag-input.component.html',
  styleUrls: ['./value-flag-input.component.scss']
})
export class ValueFlagInputComponent implements OnChanges {
  @ViewChild('appTextInput') textInputComponent!: TextInputComponent;

  @Input() public id!: string;

  @Input() public label!: string;

  @Input() public borderSize!: number;

  @Input() public observationDefinition!: ObservationDefinition;

  @Input() public displayExtraInfoOption: boolean = false;

  @Input() public disableValueFlagEntry: boolean = false;

  @Input() public simulateTabOnEnter: boolean = false;

  // Used by form entry to disable input of data when its already entered using a different source
  @Input() public duplicateObservations!: Map<string, ViewObservationModel>;

  @Output() public userInputVF = new EventEmitter<ObservationDefinition>();

  @Output() public enterKeyPress = new EventEmitter<void>();

  protected activeTab: 'new' | 'history' | 'qctests' = 'new';
  protected showChanges: boolean = false;
  protected displayExtraInfoDialog: boolean = false;
  protected duplicateObservation: ViewObservationModel | undefined;
  protected viewObservationLog!: ViewObservationLogModel[];
  protected duplicateObservationLog!: ViewObservationLogModel[];
  protected viewQCTestLog!: ViewQCTestLog[];
  protected comment: string = '';

  constructor(private cachedMetadataService: CachedMetadataService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['observationDefinition'] && this.observationDefinition) {
      this.comment = this.observationDefinition.comment ? this.observationDefinition.comment : '';
    }

    if (changes['duplicateObservations'] && this.duplicateObservations && this.observationDefinition) {
      this.duplicateObservation = this.duplicateObservations.get(`${this.observationDefinition.observation.elementId}-${this.observationDefinition.observation.datetime}`);
      if (this.duplicateObservation) {
        // If duplicate is found then disable entry of data.
        this.disableValueFlagEntry = true;
      }
    }

  }

  public focus(): void {
    this.textInputComponent.focus();
  }

  public clear(): void {
    if (this.disableValueFlagEntry) {
      return;
    }
    this.observationDefinition.updateValueFlagFromUserInput('');
    this.observationDefinition.observation.comment = '';
    this.comment = '';
    this.userInputVF.emit(this.observationDefinition);
  }

  public onSameValueInput(valueFlagInput: string, comment: string): void {
    if (this.disableValueFlagEntry) {
      return;
    }
    this.observationDefinition.updateValueFlagFromUserInput(valueFlagInput);
    this.observationDefinition.observation.comment = comment;
    this.comment = comment;
    this.userInputVF.emit(this.observationDefinition);
  }



  /**
   * Handles input change and updates its internal state
   * @param valueFlagInput e.g '200', '200E', 'M', '
   * @returns 
   */
  protected onInputEntry(valueFlagInput: string): void {
    // Validate input format validity. If there is a response then entry is invalid
    this.observationDefinition.updateValueFlagFromUserInput(valueFlagInput);
    this.userInputVF.emit(this.observationDefinition);
  }


  /**
   * Handles Enter key pressed and updates its internal state
   */
  protected onEnterKeyPressed(): void {
    // If nothing has been input then put the M flag
    if (!this.observationDefinition.valueFlagInput) {
      this.onInputEntry('M');
    }

    // Emit the enter key press event
    this.enterKeyPress.emit();
  }



  //----------------------------------------
  // Extra information functionality

  protected onDisplayExtraInfoOptionClick(): void {
    // If value flag is disabled then new comment tab will not be shown. So just show the history tab
    // Else just show the tab that the user had last clicked on
    if (this.disableValueFlagEntry) {
      this.onTabChange('history');
    }
    this.displayExtraInfoDialog = true;

  }

  protected onTabChange(selectedTab: 'new' | 'history' | 'qctests'): void {
    this.activeTab = selectedTab;
    switch (this.activeTab) {
      case 'history':
        // If there is a duplicate and this is new entry then no need to show the log table for the new entry
        if (!(this.duplicateObservation && this.observationDefinition.observation.log.length === 0)) {
          this.viewObservationLog = this.getObservationLog(this.observationDefinition.observation);
        }

        // If there is a duplicate then show the log for the duplicate as well
        if (this.duplicateObservation) {
          this.duplicateObservationLog = this.getObservationLog(this.duplicateObservation);
        }

        break;
      case 'qctests':
        this.viewQCTestLog = this.observationDefinition.getQCTestLog();
        break;
      default:
        break;
    }

  }

  protected onExtraInfoOkClicked(): void {
    // If comment is changed then update the comment
    if (this.comment !== this.observationDefinition.comment) {
      this.observationDefinition.observation.comment = this.comment;
      this.userInputVF.emit(this.observationDefinition);
    }
  }


  private getObservationLog(observation: ViewObservationModel): ViewObservationLogModel[] {
    const element = this.cachedMetadataService.getElement(observation.elementId);
    // Transform the log data accordingly
    const viewObservationLog: ViewObservationLogModel[] = observation.log.map(item => {
      const viewLog: ViewObservationLogModel = { ...item };
      // Display the values in scaled form 
      if (this.observationDefinition.scaleValue && viewLog.value && element.entryScaleFactor) {
        // To remove rounding errors number utils round off
        viewLog.value = this.observationDefinition.getUnScaledValue(viewLog.value);
      }

      // Convert the entry date time to current local time
      viewLog.entryDateTime = DateUtils.getPresentableDatetime(viewLog.entryDateTime, this.cachedMetadataService.utcOffSet);
      return viewLog;
    }
    );

    return viewObservationLog;
  }

  protected getSourceName(sourceId: number): string {
    return this.cachedMetadataService.getSource(sourceId).name;
  }



}
