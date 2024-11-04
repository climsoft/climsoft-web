import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PeriodDefinition } from '../../models/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-period-detail',
  templateUrl: './import-source-period-detail.component.html',
  styleUrls: ['./import-source-period-detail.component.scss']
})
export class ImportSourcePeriodDetailComponent {

  @Input()
  public periodDefinition!: PeriodDefinition;

  protected onPeriodStatusSelection(elementStatus: string): void {
    this.periodDefinition.columnPosition = undefined;
    this.periodDefinition.defaultPeriod = undefined;

    if (elementStatus === 'Includes Period') {
      this.periodDefinition.columnPosition = 0
    } else if (elementStatus === 'Does Not Include Period') {
      this.periodDefinition.defaultPeriod = 0;
    }
  }

  protected onPeriodSelected(selectedPeriod: number | null): void{
    if(selectedPeriod !== null){
      this.periodDefinition.defaultPeriod = selectedPeriod;
    }

  }

}
