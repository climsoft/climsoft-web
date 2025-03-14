import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-drop-down-container',
  templateUrl: './drop-down-container.component.html',
  styleUrls: ['./drop-down-container.component.scss']
})
export class DropDownContainerComponent {
  @Input() 
  public maxHeight: number = 200;

  @Input() 
  public displayDropDown: boolean = false;

  @Output() 
  public displayDropDownChange = new EventEmitter<boolean>();

  protected closeDropdown(): void{
    this.displayDropDown = false;
    this.displayDropDownChange.emit(this.displayDropDown);
  }
}
