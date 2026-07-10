import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LevelDefinition } from '../../models/import-source-tabular-params.model';

// Inclusion-control rule: this step uses a radio because each branch has its own
// sub-config (column position vs default value). Steps whose "off" state literally
// means nothing use a checkbox instead.
@Component({
  selector: 'app-import-source-level-detail',
  templateUrl: './import-source-level-detail.component.html',
  styleUrls: ['./import-source-level-detail.component.scss']
})
export class ImportSourceLevelDetailComponent {

  @Input() public levelDefinition!: LevelDefinition;
  @Output() public levelDefinitionChange = new EventEmitter<LevelDefinition>();

  protected onLevelStatusSelection(status: string): void {
    this.levelDefinition.inColumn = undefined;
    this.levelDefinition.default = undefined;

    if (status === 'Includes Level') {
      this.levelDefinition.inColumn = { columnPosition: 0 };
    } else if (status === 'Does Not Include Level') {
      this.levelDefinition.default = { value: 0 };
    }
    this.levelDefinitionChange.emit(this.levelDefinition);
  }

}
