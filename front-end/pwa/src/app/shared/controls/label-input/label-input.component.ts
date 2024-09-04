import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-label-input',
  templateUrl: './label-input.component.html',
  styleUrls: ['./label-input.component.scss']
})
export class LabelInputComponent {
  @Input() public id!: string ;
  @Input() public label!: string;
  @Input() public value!: string | number | null;
}
