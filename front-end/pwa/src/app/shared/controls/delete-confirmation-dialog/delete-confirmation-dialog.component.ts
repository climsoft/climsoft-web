import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-delete-confirmation-dialog',
  templateUrl: './delete-confirmation-dialog.component.html',
  styleUrls: ['./delete-confirmation-dialog.component.scss']
})
export class DeleteConfirmationDialogComponent {
  @Input() public itemName: string = '';
  @Input() public itemType: string = 'item';
  @Output() public deleteConfirmed = new EventEmitter<void>();

  protected open: boolean = false;

  public showDialog(): void {
    this.open = true;
  }

  protected onDeleteConfirm(): void {
    this.open = false;
    this.deleteConfirmed.emit();
  }
}
