import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ArrayUtils } from '../../utils/array.utils';


//Supports single and multiple selection when in UNEDITABLE mode.
//Does not support multiple selection when in EDITABLE mode.
@Component({
  selector: 'app-selector-input',
  templateUrl: './selector-input.component.html',
  styleUrls: ['./selector-input.component.scss']
})
export class SelectorInputComponent implements OnInit, OnChanges {

  // @Input() controlLabel: string = "Select";

  // //if editable is true then multiple should be false.
  // //editable can be false and mutliple true
  // @Input() editable: boolean = false;
  // @Input() multiple: boolean = false;
  // //enforce the data source to be of key value
  // @Input() dataSource!: any[];
  // @Input() valueMember: string = "id";
  // @Input() displayMember: string = "name";

  // //value should be an array if multiple is true. 
  // //value should not be an array if mutliple is false. If array is passed then only the first element will be used.
  // //value can be an array (of key value objects or numbers or strings)  or number or string.
  // //valueMember is always used for selection
  // @Input() value!: any;
  // @Output() valueChange = new EventEmitter<any>();

  // //note the selectedObject is defined as type 'any' because it can accept numbers, strings, key value object or array
  // //see example https://stackblitz.com/edit/ng-select?file=app%2Fapp.component.ts
  // selectedObject: any;



  // // Todo. later remove this input type after refactoring this control
  // @Input() simple: boolean = false;
  // @Input() simpleValue!: any;
  // @Input() simpleDataSource!: any;
  // @Output() simpleValueChange = new EventEmitter<any>();
  // constructor() {
  // }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {

    // Todo. later refactor this implementation
    // if (this.simple) {
    //   this.doSimpleSetup();
    //   return
    // }


    // if (!this.dataSource || !this.valueMember) {
    //   return
    // }

    // if ('value' in changes && this.value !== undefined && this.valueMember !== undefined) {
    //   //console.log('selector value', this.value);

    //   //set the selected object
    //   const newSelectedObject = ArrayUtils.findDataItems(this.dataSource, Array.isArray(this.value) ? this.value : [this.value], this.valueMember);
    //   if (!this.multiple && newSelectedObject.length > 0) {
    //     this.selectedObject = newSelectedObject[0];
    //   } else if (this.multiple && !this.editable) {
    //     //multiple selection is only supported in uneditable mode
    //     this.selectedObject = newSelectedObject;
    //   }
    // }
  }

  // onValueChange(selectedObject: any) {

  //   if (this.simple) {
  //     this.onSimpleValueChange(selectedObject);
  //     return;
  //   }


  //   this.selectedObject = selectedObject;

  //   //value emitted should be of the same type as the one set by the component that contains this component 
  //   if (this.multiple) {
  //     if (Array.isArray(this.value)) {
  //       this.value = this.value.every((item) => typeof item !== 'object') ? this.selectedObject.map((dataItem: { [x: string]: any; }) => dataItem[this.valueMember]) : [...this.selectedObject];
  //     } else {
  //       this.value = typeof this.value !== 'object' ? this.selectedObject.map((dataItem: { [x: string]: any; }) => dataItem[this.valueMember]) : [...this.selectedObject];
  //     }
  //   } else {
  //     this.value = typeof this.value !== 'object' ? this.selectedObject[this.valueMember] : { ...this.selectedObject };
  //   }

  //   this.valueChange.emit(this.value);
  // }


  // private doSimpleSetup(): void {

  //   if (!this.simpleDataSource) {
  //     if (this.dataSource) {
  //       this.dataSource = [];
  //       this.selectedObject = null;
  //     }
  //     return;
  //   }

  //   this.dataSource = this.simpleDataSource;
  //   this.selectedObject = this.simpleValue;

  // }

  // private onSimpleValueChange(selectedObject: any) {
  //   if (this.simpleValue === selectedObject) {
  //     return;
  //   }

  //   this.simpleValue = selectedObject;
  //   this.simpleValueChange.emit(this.simpleValue);

  // }

}
