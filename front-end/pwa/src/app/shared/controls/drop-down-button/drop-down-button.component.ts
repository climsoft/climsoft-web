import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-drop-down-button',
  templateUrl: './drop-down-button.component.html',
  styleUrls: ['./drop-down-button.component.scss']
})
export class DropDownButtonComponent {
  @Input() public dropDownItems!: string[];
  @Input() public translateX!: boolean ;
  @Output() public dropDownOptionClick = new EventEmitter<string>();

  protected displayDropDown: boolean = false;

  protected onButtonClick(): void {
    this.displayDropDown = !this.displayDropDown;
  }

  protected onDropDownItemClick(dropDownItem: string) {
    this.closeDropdown();
    this.dropDownOptionClick.emit(dropDownItem);
  }

  protected closeDropdown(): void{
    this.displayDropDown = false;
  }

}
