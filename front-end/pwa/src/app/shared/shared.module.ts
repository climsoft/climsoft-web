//------- angular mmodules------------------------
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
//--------------------------------

//------- material modules -------
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
//--------------------------------

//------- third party modules -------
import { NgSelectModule } from '@ng-select/ng-select';
//--------------------------------

//--------- components ------------
import { TextInputComponent } from './controls/text-input/text-input.component';
import { DateInputComponent } from './controls/date-input/date-input.component';
import { SelectorInputComponent } from './controls/selector-input/selector-input.component';
import { PaginatorComponent } from './controls/paginator/paginator.component';
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

const materialModules = [
  MatIconModule,
  MatButtonModule,
  MatListModule,
  MatFormFieldModule,
  MatRadioModule,
  MatGridListModule,
  MatSelectModule,
  MatInputModule,
  MatTableModule,
  MatCardModule,
  MatStepperModule,
  MatTabsModule,
  MatDividerModule,
  MatMenuModule,
  MatExpansionModule,
  MatDatepickerModule,
  MatNativeDateModule

];
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
  PaginatorComponent,

  DataListViewComponent,


];

@NgModule({
  declarations: [
    ...controlsComponents
  ],
  imports: [
    ...angularModules,
    ...thirdPartyModules,
    ...materialModules,
  ],
  providers: [

  ],
  exports: [
    ...angularModules,
    ...thirdPartyModules,
    ...materialModules,
    ...controlsComponents
  ]
})
export class SharedModule { }
