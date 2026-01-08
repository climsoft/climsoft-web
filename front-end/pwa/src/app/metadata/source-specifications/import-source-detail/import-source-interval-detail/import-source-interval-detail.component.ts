import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IntervalDefinition } from '../../models/import-source-tabular-params.model';

@Component({
  selector: 'app-import-source-interval-detail',
  templateUrl: './import-source-interval-detail.component.html',
  styleUrls: ['./import-source-interval-detail.component.scss']
})
export class ImportSourceIntervalDetailComponent {
  @Input()  public intervalDefinition!: IntervalDefinition;

  protected onPeriodStatusSelection(elementStatus: string): void {
    this.intervalDefinition.columnPosition = undefined;
    this.intervalDefinition.defaultInterval = undefined;

    if (elementStatus === 'Includes Interval') {
      this.intervalDefinition.columnPosition = 0
    } else if (elementStatus === 'Does Not Include Interval') {
      this.intervalDefinition.defaultInterval = 0;
    }
  }

  protected onPeriodSelected(selectedPeriod: number | null): void{
    if(selectedPeriod !== null){
      this.intervalDefinition.defaultInterval = selectedPeriod;
    }

  }

}
