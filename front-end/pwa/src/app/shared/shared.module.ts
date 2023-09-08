//------- angular mmodules------------------------
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
//--------------------------------

//------- ngx-bootstrap modules -------
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { CollapseModule } from 'ngx-bootstrap/collapse';
//--------------------------------

//------- third party modules -------
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

//--------------------------------

const angularModules = [
  CommonModule,
  ReactiveFormsModule,
  FormsModule,
  HttpClientModule,
];

const thirdPartyModules = [
  NgSelectModule
]


//--------------------------------

const controlsComponents = [
  TextInputComponent,
  SelectorInputComponent,
  DateInputComponent,

  YearInputComponent,
  MonthInputComponent,
  DayInputComponent,
  HourInputComponent,

  StationInputComponent,
  ElementInputComponent,
  

  DataListViewComponent,


];

@NgModule({
  declarations: [
    ...controlsComponents
  ],
  imports: [
    ...angularModules,
    ...thirdPartyModules,

    BsDropdownModule.forRoot(),
    CollapseModule.forRoot(),

  ],
  providers: [

  ],
  exports: [
    ...angularModules,
    ...thirdPartyModules, 
    ...controlsComponents,

    BsDropdownModule,
    CollapseModule,
    
  ]
})
export class SharedModule { }
