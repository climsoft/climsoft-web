import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-drop-down',
  templateUrl: './drop-down.component.html',
  styleUrls: ['./drop-down.component.scss']
})
export class DropDownComponent {
  @Input() public maxHeight: number = 200;
  // TODO. Translate this to something better later
  // Controls the drop down to be inside the viewable port,
  //  necessary only when the parent control is at the right end of the viewable port
  @Input() public translateX!: boolean;

}
