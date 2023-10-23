import { Component,Output,EventEmitter } from '@angular/core';
import { StationElementLimitModel } from 'src/app/core/models/station-element-limit.model';

@Component({
  selector: 'app-station-element-limits-input-dialog',
  templateUrl: './station-element-limits-input-dialog.component.html',
  styleUrls: ['./station-element-limits-input-dialog.component.scss']
})
export class StationElementLimitsInputDialogComponent {
  @Output() ok = new EventEmitter<StationElementLimitModel[]>();
  open: boolean = false;
  months!: StationElementLimitModel[];

  openDialog(): void {
  //   this.selectedIds = [];
  //   this.exludeIds = [];
  //   this.setupDialog()
   }

  onOkClick(): void {
    // Emit the updated selectedIds
    // this.ok.emit(this.selectedIds);
  }

  
}
