import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-label-input',
  templateUrl: './label-input.component.html',
  styleUrls: ['./label-input.component.scss']
})
export class LabelInputComponent implements OnChanges{
  @Input() public id!: string ;
  @Input() public label!: string;
  @Input() public value!: string | number | null;
  @Input() public labelColWidth!: number;

  protected labelColWidthClass: string = 'col-sm-2';
  protected valueColWidthClass: string = 'col-sm-10';
  
  ngOnChanges(changes: SimpleChanges): void {
    if(changes['labelColWidth'] && this.labelColWidth){
      this.labelColWidthClass = `col-sm-${this.labelColWidth}`;
      this.valueColWidthClass = `col-sm-${12-this.labelColWidth}`;
    }
  }
}
