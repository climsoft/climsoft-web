import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle-disabled-confirmation-dialog',
  templateUrl: './toggle-disabled-confirmation-dialog.component.html',
  styleUrls: ['./toggle-disabled-confirmation-dialog.component.scss']
})
export class ToggleDisabledConfirmationDialogComponent {
  @Input() public itemName: string = '';
  @Input() public itemType: string = 'item';
  @Input() public isCurrentlyDisabled: boolean = false;
  @Input() public operationType: string = ''; // e.g., 'import' or 'export'
  @Input() public schedule: string = ''; // cron schedule for enable message
  @Output() public toggleConfirmed = new EventEmitter<void>();

  protected open: boolean = false;

  public showDialog(): void {
    this.open = true;
  }

  protected get dialogTitle(): string {
    return this.isCurrentlyDisabled ? `Enable ${this.itemType}` : `Disable ${this.itemType}`;
  }

  protected get okButtonLabel(): string {
    return this.isCurrentlyDisabled ? 'Enable' : 'Disable';
  }

  protected get confirmMessage(): string {
    const action = this.isCurrentlyDisabled ? 'enable' : 'disable';
    return `Are you sure you want to ${action} the ${this.itemType} "${this.itemName}"?`;
  }

  protected onToggleConfirm(): void {
    this.open = false;
    this.toggleConfirmed.emit();
  }
}
