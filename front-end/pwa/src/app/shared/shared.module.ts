//------- angular mmodules------------------------
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
//--------------------------------

//--------- components ------------
import { TextInputComponent } from './controls/text-input/text-input.component';
import { DateInputComponent } from './controls/date-input/date-input.component';
import { SelectorInputComponent } from './controls/selector-input/selector-input.component'; 
import { YearInputComponent } from './controls/year-input/year-input.component';
import { MonthInputComponent } from './controls/month-input/month-input.component';
import { DayInputComponent } from './controls/day-input/day-input.component'; 
import { DataListViewComponent } from './controls/data-list-view/data-list-view.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
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
import { ElementSingleInputComponent } from './controls/element-input/element-single-input/element-single-input.component';
import { ElementMultipleInputComponent } from './controls/element-input/element-multiple-input/element-multiple-input.component';
import { HourSingleInputComponent } from './controls/hour-input/hour-single-input/hour-single-input.component';
import { HourMultipleInputComponent } from './controls/hour-input/hour-multiple-input/hour-multiple-input.component';
import { PeriodSingleInputComponent } from './controls/period-input/period-single-input/period-single-input.component';
import { SourceSingleInputComponent } from './controls/source-input/source-single-input/source-single-input.component';
import { StationSingleInputComponent } from './controls/station-input/station-single-input/station-single-input.component';
import { StationMultipleInputComponent } from './controls/station-input/station-multiple-input/station-multiple-input.component';
import { LabelInputComponent } from './controls/label-input/label-input.component';

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
  SelectorInputComponent,
  DateInputComponent,

  YearInputComponent,
  MonthInputComponent,
  DayInputComponent,

  DataListViewComponent,
  TableViewComponent,
  DialogComponent,
  InputDialogComponent,
  ToggleChevronComponent,

  SelectorSingleInputComponent,
  SelectorMultipleInputComponent,
  ElementSingleInputComponent,
  ElementMultipleInputComponent,
  HourSingleInputComponent,
  HourMultipleInputComponent,

  YearMonthInputComponent,

  PeriodSingleInputComponent,
  SourceSingleInputComponent,

  StationSingleInputComponent,
  StationMultipleInputComponent,



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
