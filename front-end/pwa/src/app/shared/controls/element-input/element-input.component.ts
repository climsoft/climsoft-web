import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ElementModel } from '../../../core/models/element.model';
import { ElementsService } from 'src/app/core/services/elements.service';

@Component({
  selector: 'app-element-input',
  templateUrl: './element-input.component.html',
  styleUrls: ['./element-input.component.scss']
})
export class ElementInputComponent implements OnInit, OnChanges {

  @Input() public controlLabel: string = 'Element';
  @Input() public multiple: boolean = false;
  @Input() public ids!: number[];
  @Input() public value!: any;
  @Output() public valueChange = new EventEmitter<any>();

  protected elements!: ElementModel[];
  protected selectedValue!: any;
  private bIgnoreNgChanges: boolean = false;

  constructor(private elementsSevice: ElementsService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (this.bIgnoreNgChanges) {
      this.bIgnoreNgChanges = false;
      return;
    }

    this.elementsSevice.getElements(this.ids).subscribe(data => {
      this.elements = data;
      this.selectedValue = this.value;
    });

  }

  onChange(change: any) {
    this.bIgnoreNgChanges = true;//todo. added because onChange was being raised when same value is raised outside this component
    this.value = change;
    this.selectedValue = change;
    this.valueChange.emit(change);
  }

}
