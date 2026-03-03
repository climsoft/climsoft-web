import { Component, Input } from '@angular/core';
import { IntervalDefinition } from '../../models/import-source-tabular-params.model';

@Component({
  selector: 'app-import-source-interval-detail',
  templateUrl: './import-source-interval-detail.component.html',
  styleUrls: ['./import-source-interval-detail.component.scss']
})
export class ImportSourceIntervalDetailComponent {
  @Input()  
  public intervalDefinition!: IntervalDefinition;

  protected onIntervalStatusSelection(status: string): void {
    this.intervalDefinition.columnPosition = undefined;
    this.intervalDefinition.defaultValue = undefined;

    if (status === 'Includes Interval') {
      this.intervalDefinition.columnPosition = 0
    } else if (status === 'Does Not Include Interval') {
      this.intervalDefinition.defaultValue = 0;
    }
  }

  protected onIntervalSelected(selected: number | null): void{
    if(selected !== null){
      this.intervalDefinition.defaultValue = selected;
    }
  }

}
