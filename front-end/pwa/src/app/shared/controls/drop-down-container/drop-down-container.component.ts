import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-drop-down-container',
  templateUrl: './drop-down-container.component.html',
  styleUrls: ['./drop-down-container.component.scss']
})
export class DropDownContainerComponent {
  @Input() public maxHeight: number = 200;
  @Input() public minWidth: number = 0;
  @Input() public displayDropDown: boolean = false;
  @Input() public offSetRight: boolean = false;

  @Output() public displayDropDownChange = new EventEmitter<boolean>();

  protected closeDropdown(): void {
    // The directive only listens on the document while the drop down is open,
    // but still report only a real open -> closed transition.
    if (!this.displayDropDown) {
      return;
    }
    this.displayDropDown = false;
    this.displayDropDownChange.emit(this.displayDropDown);
  }
}
