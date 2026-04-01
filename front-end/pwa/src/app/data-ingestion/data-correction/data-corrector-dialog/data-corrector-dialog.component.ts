import { Component, EventEmitter, Output } from '@angular/core';
import { ViewObservationQueryModel } from '../../models/view-observation-query.model';

@Component({
  selector: 'app-data-corrector-dialog',
  templateUrl: './data-corrector-dialog.component.html',
  styleUrls: ['./data-corrector-dialog.component.scss']
})
export class DataCorrectorDialogComponent {

  @Output() changesSubmitted = new EventEmitter<void>();

  protected open = false;

  // Filter from parent
  protected queryFilter: ViewObservationQueryModel = {};

  protected enableSubmitButton: boolean = false;
  protected submitChanges: boolean = false;

  constructor() { }

  public openDialog(queryFilter: ViewObservationQueryModel): void {
    this.open = true;
    this.queryFilter = { ...queryFilter };
    this.enableSubmitButton = false;
    this.submitChanges = false;
  }

  protected onUserChanges(changedCount: number) {
    this.enableSubmitButton = changedCount > 0;
  }

  protected onSubmitChanges(): void {
    if (this.queryFilter && this.enableSubmitButton) {
      this.submitChanges = true;
    }
  }

  protected onChangesSubmitted(): void {
    this.open = false;
    this.changesSubmitted.emit();
  }

}
