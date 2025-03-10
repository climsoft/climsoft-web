import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IntervalDefinition } from '../../models/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-period-detail',
  templateUrl: './import-source-period-detail.component.html',
  styleUrls: ['./import-source-period-detail.component.scss']
})
export class ImportSourcePeriodDetailComponent {

  @Input()
  public periodDefinition!: IntervalDefinition;

  protected onPeriodStatusSelection(elementStatus: string): void {
    this.periodDefinition.columnPosition = undefined;
    this.periodDefinition.defaultInterval = undefined;

    if (elementStatus === 'Includes Interval') {
      this.periodDefinition.columnPosition = 0
    } else if (elementStatus === 'Does Not Include Interval') {
      this.periodDefinition.defaultInterval = 0;
    }
  }

  protected onPeriodSelected(selectedPeriod: number | null): void{
    if(selectedPeriod !== null){
      this.periodDefinition.defaultInterval = selectedPeriod;
    }

  }

}
