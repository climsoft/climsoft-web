//------- angular mmodules------------------------
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
//--------------------------------

//------- third party modules -------
// Todo. remove these dependencies after refactoring the multiple selector
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { CollapseModule } from 'ngx-bootstrap/collapse'; 
import { NgSelectModule } from '@ng-select/ng-select';
//--------------------------------

//--------- components ------------
import { TextInputComponent } from './controls/text-input/text-input.component';
import { DateInputComponent } from './controls/date-input/date-input.component';
import { SelectorInputComponent } from './controls/selector-input/selector-input.component';
import { HourInputComponent } from './controls/hour-input/hour-input.component';
import { StationInputComponent } from './controls/station-input/station-input.component';
import { YearInputComponent } from './controls/year-input/year-input.component';
import { MonthInputComponent } from './controls/month-input/month-input.component';
import { DayInputComponent } from './controls/day-input/day-input.component';
import { ElementInputComponent } from './controls/element-input/element-input.component';
import { DataListViewComponent } from './controls/data-list-view/data-list-view.component';
import { HttpClientModule } from '@angular/common/http';
import { NumberInputComponent } from './controls/number-input/number-input.component';
import { TableViewComponent } from './controls/table-view/table-view.component';
import { DialogComponent } from './controls/dialog/dialog.component';
import { ToggleChevronComponent } from './controls/toggle-chevron/toggle-chevron.component';
import { InputDialogComponent } from './controls/input-dialog/input-dialog.component';
import { PeriodSelectorComponent } from './controls/period-selector/period-selector.component';
import { SelectorComponent } from './controls/selector/selector.component';
import { SimulateTabOnEnterDirective } from '../shared/simulate-tab-on-enter.directive';
import { CloseDropDownDirective } from './close-drop-down.directive';

//--------------------------------

const angularModules = [
  CommonModule,
  ReactiveFormsModule,
  FormsModule,
  HttpClientModule,
];

//--------------------------------

const controlsComponents = [
  TextInputComponent,
  NumberInputComponent,
  SelectorInputComponent,
  DateInputComponent,

  YearInputComponent,
  MonthInputComponent,
  DayInputComponent,
  HourInputComponent,
 
  StationInputComponent,
  ElementInputComponent,
  PeriodSelectorComponent, 

  DataListViewComponent,
  TableViewComponent,
  DialogComponent,
  InputDialogComponent,
  ToggleChevronComponent,

  
  SelectorComponent,

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

    BsDropdownModule.forRoot(),
    CollapseModule.forRoot(), 
    NgSelectModule,

  ],
  providers: [

  ],
  exports: [
    ...angularModules,
    ...controlsComponents,
    ...directives,

    BsDropdownModule,
    CollapseModule, 
    NgSelectModule,

  ]
})
export class SharedModule { }
