//------- angular mmodules------------------------
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
//--------------------------------
 
//--------- components ------------
import { TextInputComponent } from './controls/text-input/text-input.component';
import { DateInputComponent } from './controls/date-input/date-input.component';
import { DataListViewComponent } from './controls/data-list-view/data-list-view.component';
import { NumberInputComponent } from './controls/number-input/number-input.component';
import { TableViewComponent } from './controls/table-view/table-view.component';
import { DialogComponent } from './controls/dialog/dialog.component';
import { ToggleChevronComponent } from './controls/toggle-chevron/toggle-chevron.component';
import { InputDialogComponent } from './controls/input-dialog/input-dialog.component';
import { SimulateTabOnEnterDirective } from '../shared/simulate-tab-on-enter.directive';
import { CloseDropDownDirective } from './close-drop-down.directive';
import { YearMonthInputComponent } from './controls/year-month-input/year-month-input.component';
import { SelectorMultipleInputComponent } from './controls/selector-input/selector-multiple-input/selector-multiple-input.component';
import { SelectorSingleInputComponent } from './controls/selector-input/selector-single-input/selector-single-input.component';

import { HourSingleInputComponent } from './controls/hour-input/hour-single-input/hour-single-input.component';
import { HourMultipleInputComponent } from './controls/hour-input/hour-multiple-input/hour-multiple-input.component';
import { IntervalSingleInputComponent } from './controls/period-input/interval-single-input/interval-single-input.component';
import { LabelInputComponent } from './controls/label-input/label-input.component';
import { DropDownButtonComponent } from './controls/drop-down-button/drop-down-button.component'; 
import { ElementDomainSingleInputComponent } from './controls/element-domain-input/element-domain-single-input/element-domain-single-input.component';
import { ElementSubdomainSingleInputComponent } from './controls/element-subdomain-input/element-subdomain-single-input/element-subdomain-single-input.component';
import { CheckBoxInputComponent } from './controls/check-box-input/check-box-input.component';
import { RadioButtonsInputComponent } from './controls/radio-buttons-input/radio-buttons-input.component';
import { ServerTypeInputComponent } from './controls/server-type-input/server-type-input.component';
import { FlagSingleInputComponent } from './controls/flag-input/flag-single-input/flag-single-input.component';
import { PageInputComponent } from './controls/page-input/page-input.component';
import { DropDownContainerComponent } from './controls/drop-down-container/drop-down-container.component';
import { MapComponent } from './controls/map/map.component';
import { DataStructureInputComponent } from './controls/data-structure-input/data-structure-input.component';
import { DateRangeInputComponent } from './controls/date-range-input/date-range-input.component';
import { IntervalSelectorMultipleComponent } from './controls/period-input/interval-selector-multiple/interval-selector-multiple.component';

//--------------------------------
  
const angularModules = [
  CommonModule,
  ReactiveFormsModule,
  FormsModule,
  HttpClientModule,
];

//--------------------------------

const controlsComponents = [
  LabelInputComponent,
  TextInputComponent,
  NumberInputComponent,
  DateInputComponent,
  CheckBoxInputComponent,
  RadioButtonsInputComponent,

  DataListViewComponent,
  TableViewComponent,
  DialogComponent,
  InputDialogComponent,
  ToggleChevronComponent,

  SelectorSingleInputComponent,
  SelectorMultipleInputComponent,

  HourSingleInputComponent,
  HourMultipleInputComponent,
  YearMonthInputComponent,
  IntervalSingleInputComponent,
  
  DropDownButtonComponent,    
  ElementDomainSingleInputComponent,  
  ElementSubdomainSingleInputComponent,
  ServerTypeInputComponent,
  FlagSingleInputComponent,
  PageInputComponent,
  DropDownContainerComponent, 
 
  MapComponent,
  DataStructureInputComponent,

  DateRangeInputComponent,
  IntervalSelectorMultipleComponent,
];

const directives = [
  SimulateTabOnEnterDirective,
  CloseDropDownDirective,
]

@NgModule({
  declarations: [
    ...controlsComponents,
    ...directives, 
  ],
  imports: [
    ...angularModules,
  ],
  providers: [
   
  ],
  exports: [
    ...angularModules,
    ...controlsComponents,
    ...directives,

  ]
})
export class SharedModule { }
