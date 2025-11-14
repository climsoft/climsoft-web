import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-radio-buttons-input',
  templateUrl: './radio-buttons-input.component.html',
  styleUrls: ['./radio-buttons-input.component.scss']
})
export class RadioButtonsInputComponent<T> implements OnChanges {
  @Input() public inline: boolean = false;
  @Input() public asButtons: boolean = false;
  @Input() public groupName!: string;
  @Input() public groupItems!: { label: T, checked?: boolean, hintMessage?: string }[];
  @Input() public checkedValue!: T;
  @Input() public groupItemDisplayFn: (option: T) => string = (option => String(option));
  @Output() public checkedValueChange = new EventEmitter<T>();

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.groupItems && this.checkedValue) {
      const valueFound = this.groupItems.find(item => (item.label === this.checkedValue));
      if (valueFound) {
        valueFound.checked = true;
      }
    }
  }

  protected onValueChange(index: number, newCheckedStatus: boolean) {
    const item = this.groupItems[index];
    item.checked = newCheckedStatus;
    this.checkedValue = item.label;
    this.checkedValueChange.emit(this.checkedValue);
  }

}
