import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-radio-buttons-input',
  templateUrl: './radio-buttons-input.component.html',
  styleUrls: ['./radio-buttons-input.component.scss']
})
export class RadioButtonsInputComponent implements OnChanges {

  @Input() inline: boolean= false;
  @Input() asButtons: boolean= false;
  @Input() groupName!: string;
  @Input() groupItems!: { label: string, checked?: boolean, hintMessage?: string }[];
  @Input() checkedValue!: string;
  @Output() checkedValueChange = new EventEmitter<string>();

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.groupItems && this.checkedValue) {
      const valueFound = this.groupItems.find(item =>  (item.label === this.checkedValue) );
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
