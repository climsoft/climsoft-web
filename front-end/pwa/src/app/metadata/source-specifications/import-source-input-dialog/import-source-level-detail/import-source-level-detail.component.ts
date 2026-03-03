import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IntervalDefinition } from '../../models/import-source-tabular-params.model';

@Component({
  selector: 'app-import-source-level-detail',
  templateUrl: './import-source-level-detail.component.html',
  styleUrls: ['./import-source-level-detail.component.scss']
})
export class ImportSourceLevelDetailComponent {

  @Input()
  public levelDefinition!: IntervalDefinition;

  protected onLevelStatusSelection(status: string): void {
    this.levelDefinition.columnPosition = undefined;
    this.levelDefinition.defaultValue = undefined;

    if (status === 'Includes Level') {
      this.levelDefinition.columnPosition = 0
    } else if (status === 'Does Not Include Level') {
      this.levelDefinition.defaultValue = 0;
    }
  }

}