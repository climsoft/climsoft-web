
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { MetadataModule } from '../metadata/metadata.module';
import { QuerySelectionComponent } from './query-selection/query-selection.component';
import { UnstackedDataViewerComponent } from './unstacked-data-viewer/unstacked-data-viewer.component';
import { ValueFlagInputComponent } from './value-flag-input/value-flag-input.component';
import { StackedDataViewerComponent } from './stacked-data-viewer/stacked-data-viewer.component';

@NgModule({

  declarations: [
    QuerySelectionComponent,
    StackedDataViewerComponent,
    UnstackedDataViewerComponent,
    ValueFlagInputComponent,
  ],
  imports: [
    SharedModule,
    MetadataModule,
  ], 
  exports: [
    QuerySelectionComponent,
    StackedDataViewerComponent,
    UnstackedDataViewerComponent,
    ValueFlagInputComponent,
  ]
})
export class ObservationsModule { }
