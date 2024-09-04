import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-drop-down-container',
  templateUrl: './drop-down-container.component.html',
  styleUrls: ['./drop-down-container.component.scss']
})
export class DropDownContainerComponent {
  @Input() 
  public maxHeight: number = 200;

  // TODO. Translate this to something better later
  // Controls the drop down to be inside the viewable port,
  //  necessary only when the parent control is at the right end of the viewable port
  @Input() 
  public translateX!: boolean;

  @Input() 
  public displayDropDown: boolean = false;

  @Output() 
  public displayDropDownChange = new EventEmitter<boolean>();

  protected closeDropdown(): void{
    this.displayDropDown = false;
    this.displayDropDownChange.emit(this.displayDropDown);
  }
}
