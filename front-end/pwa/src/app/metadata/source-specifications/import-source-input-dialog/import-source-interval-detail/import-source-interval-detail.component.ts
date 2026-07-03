import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IntervalDefinition } from '../../models/import-source-tabular-params.model';

// Inclusion-control rule: this step uses a radio because each branch has its own
// sub-config (column position vs default value). Steps whose "off" state literally
// means nothing use a checkbox instead.
@Component({
  selector: 'app-import-source-interval-detail',
  templateUrl: './import-source-interval-detail.component.html',
  styleUrls: ['./import-source-interval-detail.component.scss']
})
export class ImportSourceIntervalDetailComponent {
  @Input()
  public intervalDefinition!: IntervalDefinition;

  @Output()
  public intervalDefinitionChange = new EventEmitter<IntervalDefinition>();

  protected onIntervalStatusSelection(status: string): void {
    this.intervalDefinition.inColumn = undefined;
    this.intervalDefinition.default = undefined;

    if (status === 'Includes Interval') {
      this.intervalDefinition.inColumn = { columnPosition: 0 };
    } else if (status === 'Does Not Include Interval') {
      this.intervalDefinition.default = { value: 0 };
    }

    this.intervalDefinitionChange.emit(this.intervalDefinition);
  }

  protected onIntervalSelected(selected: number | null): void {
    if (selected !== null && this.intervalDefinition.default) {
      this.intervalDefinition.default.value = selected;
    }
    this.intervalDefinitionChange.emit(this.intervalDefinition);
  }
}
