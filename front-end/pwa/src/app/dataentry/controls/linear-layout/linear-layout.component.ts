import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { ObservationModel } from 'src/app/core/models/observation.model';
import { DataSelectorsValues } from '../../form-entry/form-entry.component';
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { FlagModel } from 'src/app/core/models/Flag.model';
import { EntryFieldItem, FormEntryUtil } from '../../form-entry/form-entry.util';
import { ViewPortSize, ViewportService } from 'src/app/core/services/viewport.service';

@Component({
  selector: 'app-linear-layout',
  templateUrl: './linear-layout.component.html',
  styleUrls: ['./linear-layout.component.scss']
})
export class LnearLayoutComponent implements OnInit, OnChanges {
  @Input() elements!: ElementModel[];
  @Input() dataSelectors!: DataSelectorsValues;
  @Input() formMetadata!: EntryForm;
  @Input() dbObservations!: ObservationModel[];
  @Input() flags!: FlagModel[];
  @Output() valueChange = new EventEmitter<ObservationModel>();

  // Todo, change this to a typed interface
  protected fieldDefinitions!: [number, string][];
  protected fieldDefinitionsChunks!: [number, string][][];
  protected entryObservations!: ObservationModel[];
  protected total: number = 0;
  protected largeScreen: boolean = false;

  constructor(private viewPortService: ViewportService) {
    this.viewPortService.viewPortSize.subscribe((viewPortSize) => {
      this.largeScreen = viewPortSize === ViewPortSize.Large;
    });
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    //only proceed with seting up the control if all inputs have been set.
    if (this.dbObservations && this.elements && this.elements.length > 0 &&
      this.dataSelectors && this.formMetadata &&
      this.flags && this.flags.length > 0) {

      // Get the new definitions 
      this.setup(this.dataSelectors, this.elements, this.formMetadata, this.dbObservations);

    } else {
      this.entryObservations = [];
    }

  }

  private setup(dataSelectors: DataSelectorsValues, elements: ElementModel[], formMetadata: EntryForm, observations: ObservationModel[]): void {
    //get entry field to use for control definitions
    const entryField = formMetadata.fields[0];
    const fieldDefinitions: [number, string][] = FormEntryUtil.getEntryFieldDefs(
      entryField, elements, dataSelectors.year, dataSelectors.month, formMetadata.hours
    );
    const entryFieldItems: EntryFieldItem = { fieldProperty: entryField, fieldValues: fieldDefinitions.map(data => (data[0])) }
    const controlDefs: ObservationModel[] = FormEntryUtil.getEntryObservationsForLinearLayout(dataSelectors, entryFieldItems, observations);

    this.fieldDefinitions = fieldDefinitions;
    this.fieldDefinitionsChunks = this.getFieldDefsChunks(this.fieldDefinitions);
    this.entryObservations = controlDefs;
  }

  protected getEntryObservation(fieldDef: [number, string]): ObservationModel {
    const index: number = this.fieldDefinitions.findIndex(data => (data === fieldDef));
    return this.entryObservations[index];
  }

  //todo. Push this to array utils
  private getFieldDefsChunks(fieldDefs: [number, string][]): [number, string][][] {
    const chunks: [number, string][][] = [];
    const chunkSize: number = 5;
    for (let i = 0; i < fieldDefs.length; i += chunkSize) {
      chunks.push(fieldDefs.slice(i, i + chunkSize));
    }
    return chunks;
  }


  protected onValueChange(entryObservation: ObservationModel): void {
    this.valueChange.emit(entryObservation);
  }

  protected onTotalInput(value: number | null): void {
    if (!value) {
      return;
    }
    //todo. think about the total
    //should we have it displayed when the form is shown
    //left here
    this.total = value;
  }

}
