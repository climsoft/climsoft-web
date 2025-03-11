import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core'; 
import { ObservationDefinition } from '../defintitions/observation.definition';
import { TextInputComponent } from 'src/app/shared/controls/text-input/text-input.component';
import { NumberUtils } from 'src/app/shared/utils/number.utils';
import { ObservationsService } from '../../services/observations.service';

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

  @Input()
  public id!: string;

  @Input()
  public label!: string;

  @Input()
  public borderSize!: number;

  @Input()
  public observationDefinition!: ObservationDefinition;

  @Input()
  public displayExtraInfoOption: boolean = false;

  @Input()
  public disableValueFlagEntry: boolean = false;

  @Output()
  public userInputVF = new EventEmitter<ObservationDefinition>();

  @Output() public enterKeyPress = new EventEmitter<void>();

  protected showChanges: boolean = false;

  protected displayExtraInfoDialog: boolean = false;

  protected activeTab: 'new' | 'history' = 'new';

  // These variables are needed because they are set in a dialog 

  protected periodInDays: number | null = null;
  protected disablePeriodEditing: boolean = false;
  protected comment!: string | null;

  constructor(private observationService: ObservationsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.observationDefinition) {

      this.resetInternals();

      // If not declared as disabled then disable any future data entry
      if (!this.disableValueFlagEntry) {
        // Disable entry of future dates, excluding hour because the observation date times are in UTC.
        const obsDate = new Date(this.observationDefinition.observation.datetime);
        const nowDate = new Date();
        this.disableValueFlagEntry = new Date(obsDate.getFullYear(), obsDate.getMonth(), obsDate.getDate()) > new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
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
    this.observationDefinition.updateCommentInput('');
    this.observationDefinition.updatePeriodInput(this.observationDefinition.originalPeriod);
    this.resetInternals();
    this.userInputVF.emit(this.observationDefinition);
  }

  public onSameValueInput(valueFlagInput: string, comment: string | null): void {
    if (this.disableValueFlagEntry) {
      return;
    }
    this.observationDefinition.updateValueFlagFromUserInput(valueFlagInput);
    this.observationDefinition.updateCommentInput(comment);
    this.observationDefinition.updatePeriodInput(this.observationDefinition.originalPeriod);
    this.resetInternals();
    this.userInputVF.emit(this.observationDefinition);
  }

  private resetInternals(): void {
    // Disable period editing if the observation is already cumulative
    this.disablePeriodEditing = this.observationDefinition.existsInDatabase;

    // Get period in days for data that has a period of a day or greater
    this.periodInDays = this.observationDefinition.period >= 1440 ? NumberUtils.roundOff(this.observationDefinition.period / 1440, 4) : null;

    // Get the comment from database
    this.comment = this.observationDefinition.comment;
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
    this.displayExtraInfoDialog = true;
  }

  protected onTabChange(selectedTab: 'new' | 'history'): void {
    this.activeTab = selectedTab;
    if (selectedTab === 'history') {
      this.observationDefinition.loadObservationLog(this.observationService);
    }
  }

  protected onExtraInfoOkClicked(): void {
    let bValueChanged: boolean = false;

    if (!this.disablePeriodEditing && this.periodInDays !== null) {
      const newPeriodInMins: number = this.periodInDays * 1440;
      if (newPeriodInMins > this.observationDefinition.period) {
        this.observationDefinition.updatePeriodInput(newPeriodInMins);
        this.observationDefinition.updateValueFlagFromUserInput(
          this.observationDefinition.observation.value === null ? 'C' : `${this.observationDefinition.getUnScaledValue(this.observationDefinition.observation.value)}C`
        )
        bValueChanged = true
      }
    }

    if (this.comment !== this.observationDefinition.comment) {
      this.observationDefinition.updateCommentInput(this.comment);
      bValueChanged = true
    }

    if (bValueChanged) {
      this.userInputVF.emit(this.observationDefinition);
    }

  }



}
