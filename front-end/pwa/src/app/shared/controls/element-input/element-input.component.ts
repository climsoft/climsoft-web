import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ElementModel } from '../../../core/models/element.model';
import { ElementsService } from 'src/app/core/services/elements.service';

@Component({
  selector: 'app-element-input',
  templateUrl: './element-input.component.html',
  styleUrls: ['./element-input.component.scss']
})
export class ElementInputComponent implements OnInit, OnChanges {

  @Input() controlLabel: string = 'Element';
  @Input() multiple: boolean = false;
  @Input() ids!: number[];
  @Input() value!: any;
  @Output() valueChange = new EventEmitter<any>();
  elements!: ElementModel[];

  selectedValue!: any;
  bIgnoreNgChanges: boolean= false;

  constructor(private elementsSevice: ElementsService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    if(this.bIgnoreNgChanges){
      this.bIgnoreNgChanges = false;
      return;
    }

    this.elementsSevice.getElements(this.ids).subscribe(data => {
      this.elements = data;
      this.selectedValue = this.value;
    });

  }

  onChange(change: any) {
    this.bIgnoreNgChanges = true;//todo. added because thng changes was being raised when same value is raised uoutside this component
    this.value = change;
    this.selectedValue = change;
    this.valueChange.emit(change);   
  }

}
