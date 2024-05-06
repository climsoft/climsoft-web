import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ObservationsService } from 'src/app/core/services/observations/observations.service';
import { ViewObservationLogModel } from 'src/app/core/models/observations/view-observation-log.model';
import { ViewObservationLogQueryModel } from 'src/app/core/models/observations/view-observation-log-query.model';
import { take } from 'rxjs';
import { DateUtils } from 'src/app/shared/utils/date.utils';
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
  public id: string | number = '';

  @Input()
  public label: string = '';

  @Input()
  public observationDefinition!: ObservationDefinition;

  @Input()
  public enforceLimitCheck: boolean = true;

  @Input()
  public displayHistoryOption: boolean = false;

  @Output()
  public valueChange = new EventEmitter<ObservationDefinition>();

  /** 
   * Holds the validation response used by input component to display error.
   * When not empty the observation validity should be false as well  
   */
  protected validationResponse: string = ''

  /** 
   * Holds the observation log used of the linked observation model
   * Used by the log controls
   */
  protected obsLog!: ViewObservationLogModel[];

  constructor(private observationService: ObservationsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    // reset the log
    this.obsLog = [];
  }

  /**
   * Handles input change and updates its internal state
   * @param valueFlagInput e.g '200', '200E', 'M', '
   * @returns 
   */
  protected onInputEntry(valueFlagInput: string): void {
    // Validate input format validity. If there is a response then entry is invalid
    this.validationResponse = this.observationDefinition.setValueFlagFromInput(valueFlagInput, this.enforceLimitCheck);
    this.valueChange.emit(this.observationDefinition);
  }

  /**
   * Hnadles Enter key pressed and updates its internal state
   */
  protected onEnterKeyPressed(): void {
    // If nothing has been input then put the M flag
    if (!this.observationDefinition.valueFlagForDisplay) {
      this.onInputEntry('M');
    }
  }

  /**
   * Raised when the comment component has its value changed
   */
  protected onCommentEntry(comment: string): void {
    this.observationDefinition.observation.comment = comment;
    this.valueChange.emit(this.observationDefinition);
  }

  /**
   * Raised when the log component is displayed 
   */
  protected loadObservationLog(): void {

    // Note the function is called twice, when drop down is opened and when it's closed
    // So this obsLog truthy check prevents unnecessary reloading

    if (this.obsLog && this.obsLog.length > 0) {
      // No need to reload the log
      return;
    }

    // Create an observation log query dto.
    const query: ViewObservationLogQueryModel = {
      stationId: this.observationDefinition.observation.stationId,
      elementId: this.observationDefinition.observation.elementId,
      sourceId: this.observationDefinition.observation.sourceId,
      elevation: this.observationDefinition.observation.elevation,
      datetime: this.observationDefinition.observation.datetime,
      period: this.observationDefinition.observation.period
    };

    this.observationService.findObsLog(query).pipe(
      take(1)
    ).subscribe(data => {

      // Transform the log data accordingly
      this.obsLog = data.map(item => {

        // Display the values in scaled form 
        if (item.value && this.observationDefinition.elementMetadata.entryScaleFactor) {
          // To remove rounding errors use Math.floor()
          item.value = Math.floor(item.value * this.observationDefinition.elementMetadata.entryScaleFactor);
        }

        // Convert the entry date time to current local time
        item.entryDateTime = DateUtils.getDateInSQLFormatFromDate(new Date(item.entryDateTime))

        return item;

      }

      )
    });

  }






}
