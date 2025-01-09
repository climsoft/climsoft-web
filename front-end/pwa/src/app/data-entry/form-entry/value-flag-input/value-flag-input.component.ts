import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ObservationsService } from 'src/app/data-entry/services/observations.service';
import { ObservationDefinition } from '../defintions/observation.definition';

/**
 * Component for data entry of observations
 */

@Component({
  selector: 'app-value-flag-input',
  templateUrl: './value-flag-input.component.html',
  styleUrls: ['./value-flag-input.component.scss']
})
export class ValueFlagInputComponent implements OnChanges {
  @Input()
  public id: string = '';

  @Input()
  public label: string = '';

  @Input()
  public observationDefinition!: ObservationDefinition;

  @Input()
  public displayExtraInfoOption: boolean = false;

  @Input()
  public disableValueFlagEntry: boolean = false;

  @Output()
  public valueChange = new EventEmitter<ObservationDefinition>();

  protected showChanges: boolean = false;

  protected displayExtraInfoDialog: boolean = false;

  protected activeTab: 'new' | 'history' = 'new';

  protected period!: number | null;
  protected periodType!: string;
  protected comment!: string | null;

  constructor(private observationService: ObservationsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.observationDefinition) {
      this.period = this.observationDefinition.period;
      this.periodType = 'Minutes';
      this.comment = this.observationDefinition.comment;

      if (!this.disableValueFlagEntry) {
        // Disable entry of future dates, excluding hour because the observation date times are in UTC.
        const obsDate = new Date(this.observationDefinition.observation.datetime);
        const nowDate = new Date();
        this.disableValueFlagEntry = new Date(obsDate.getFullYear(), obsDate.getMonth(), obsDate.getDate()) > new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())
      }
    }

  }

  /**
   * Handles input change and updates its internal state
   * @param valueFlagInput e.g '200', '200E', 'M', '
   * @returns 
   */
  protected onInputEntry(valueFlagInput: string): void {
    // Validate input format validity. If there is a response then entry is invalid
    this.observationDefinition.updateValueFlagFromUserInput(valueFlagInput);
    this.valueChange.emit(this.observationDefinition);
  }

  /**
   * Handles Enter key pressed and updates its internal state
   */
  protected onEnterKeyPressed(): void {
    // If nothing has been input then put the M flag
    if (!this.observationDefinition.valueFlagForDisplay) {
      this.onInputEntry('M');
    }
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

  protected onExtraInfoChanged(): void {
    let bValueChanged: boolean = false;

    let newPeriodInMins: number | null;
    if (this.periodType === 'Days' && this.period) {
      newPeriodInMins = this.period * 1440;
    } else {
      newPeriodInMins = this.period;
    }

    if (newPeriodInMins && newPeriodInMins !== this.observationDefinition.period) {
      this.observationDefinition.updatePeriodInput(newPeriodInMins);
      bValueChanged = true
    }

    if (this.comment !== this.observationDefinition.comment) {
      this.observationDefinition.updateCommentInput(this.comment);
      bValueChanged = true
    }

    this.valueChange.emit(this.observationDefinition);

  }



}
