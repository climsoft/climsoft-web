//------- angular mmodules------------------------
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
//--------------------------------

//--------- components ------------
import { TextInputComponent } from './controls/text-input/text-input.component';
import { DateInputComponent } from './controls/date-input/date-input.component';
import { SelectorInputComponent } from './controls/selector-input/selector-input.component'; 
import { YearInputComponent } from './controls/year-input/year-input.component';
import { MonthInputComponent } from './controls/month-input/month-input.component';
import { DayInputComponent } from './controls/day-input/day-input.component'; 
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
import { ElementSingleInputComponent } from './controls/element-input/element-single-input/element-single-input.component';
import { ElementMultipleInputComponent } from './controls/element-input/element-multiple-input/element-multiple-input.component';
import { HourSingleInputComponent } from './controls/hour-input/hour-single-input/hour-single-input.component';
import { HourMultipleInputComponent } from './controls/hour-input/hour-multiple-input/hour-multiple-input.component';
import { PeriodSingleInputComponent } from './controls/period-input/period-single-input/period-single-input.component';
import { SourceSingleInputComponent } from './controls/source-input/source-single-input/source-single-input.component';
import { StationSingleInputComponent } from './controls/station-input/station-single-input/station-single-input.component';
import { StationMultipleInputComponent } from './controls/station-input/station-multiple-input/station-multiple-input.component';
import { LabelInputComponent } from './controls/label-input/label-input.component';
import { StationObsMethodSingleInputComponent } from './controls/station-obs-method-input/station-obs-method-single-input/station-obs-method-single-input.component';
import { StationObsEnvSingleInputComponent } from './controls/station-obs-env-input/station-obs-environment-single-input/station-obs-env-single-input.component';
import { StationObservationFocusSingleInputComponent } from './controls/station-obs-focus-input/station-obs-focus-single-input/station-obs-focus-single-input.component';
import { StationStatusSingleInputComponent } from './controls/station-status-input/station-status-single-input/station-status-single-input.component';
import { DropDownButtonComponent } from './controls/drop-down-button/drop-down-button.component';
import { DropDownComponent } from './controls/drop-down/drop-down.component';
import { ElementDomainSingleInputComponent } from './controls/element-domain-input/element-domain-single-input/element-domain-single-input.component';
import { ElementSubdomainSingleInputComponent } from './controls/element-subdomain-input/element-subdomain-single-input/element-subdomain-single-input.component';
import { ElementTypeSingleInputComponent } from './controls/element-type-input/element-type-single-input/element-type-single-input.component';
import { CheckBoxInputComponent } from './controls/check-box-input/check-box-input.component';
import { RadioButtonsInputComponent } from './controls/radio-buttons-input/radio-buttons-input.component';
import { ServerTypeInputComponent } from './controls/server-type-input/server-type-input.component';
import { FlagSingleInputComponent } from './controls/flag-input/flag-single-input/flag-single-input.component';

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
  CheckBoxInputComponent,
  RadioButtonsInputComponent,

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
  StationObsMethodSingleInputComponent,
  StationObsEnvSingleInputComponent,
  StationObservationFocusSingleInputComponent,
  StationStatusSingleInputComponent,

  DropDownButtonComponent,
  DropDownComponent, 
  
  ElementDomainSingleInputComponent,  
  ElementSubdomainSingleInputComponent,
  ElementTypeSingleInputComponent,

  ServerTypeInputComponent,
  FlagSingleInputComponent,

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
