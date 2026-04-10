import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { ViewObservationQueryModel } from '../../models/view-observation-query.model';
import { DataCorrectorComponent } from '../data-corrector/data-corrector.component';

@Component({
  selector: 'app-data-corrector-dialog',
  templateUrl: './data-corrector-dialog.component.html',
  styleUrls: ['./data-corrector-dialog.component.scss']
})
export class DataCorrectorDialogComponent {
  @ViewChild('dataCorrector') protected dataCorrector!: DataCorrectorComponent;

  @Output() public userChangesSubmitted = new EventEmitter<void>();

  protected open = false;

  protected enableSubmitButton: boolean = false;

  constructor() { }

  public openDialog(queryFilter: ViewObservationQueryModel): void {
    this.open = true;
    this.enableSubmitButton = false;
    // setTimeout needed because child is behind *ngIf="open"
    setTimeout(() => this.dataCorrector.executeQuery({ ...queryFilter }));
  }

  protected onUserChanges(changedCount: number) {
    this.enableSubmitButton = changedCount > 0;
  }

  protected onSubmitChanges(): void {
    if (this.enableSubmitButton) {
      this.dataCorrector.submit();
    }
  }

  protected onuserChangesSubmitted(): void {
    this.userChangesSubmitted.emit();
  }

}
