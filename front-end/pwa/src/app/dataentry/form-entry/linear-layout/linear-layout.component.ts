import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { EntryFieldItem, FormEntryUtil } from '../defintions/form-entry.util';
import { ViewPortSize, ViewportService } from 'src/app/core/services/view-port.service';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { FormEntryDefinition } from '../defintions/form-entry.definition';
import { FieldEntryDefinition } from '../defintions/field.definition';
import { ObservationDefinition } from '../defintions/observation.definition';

@Component({
  selector: 'app-linear-layout',
  templateUrl: './linear-layout.component.html',
  styleUrls: ['./linear-layout.component.scss']
})
export class LnearLayoutComponent implements OnInit, OnChanges {
  @Input() public formDefinitions!: FormEntryDefinition;
  @Input() public dbObservations!: CreateObservationModel[];
  @Output() public valueChange = new EventEmitter<CreateObservationModel>();
  @Output() public enableSave = new EventEmitter<boolean>();

  // Todo, change this to a typed interface
  protected fieldDefinitions!: FieldEntryDefinition[];
  protected fieldDefinitionsChunks!: FieldEntryDefinition[][];
  protected observationsDefinitions!: ObservationDefinition[];
  protected entryTotal!: { value: number | null, errorMessage: string | null };
  protected largeScreen: boolean = true;

  constructor(private viewPortService: ViewportService) {
    this.viewPortService.viewPortSize.subscribe((viewPortSize) => {
      this.largeScreen = viewPortSize === ViewPortSize.LARGE;
    });
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    //only proceed with seting up the control if all inputs have been set.
    if (this.formDefinitions && this.dbObservations) {
      this.setup();
    } else {
      this.observationsDefinitions = [];
    }

  }

  private setup(): void {
    //get entry field to use for control definitions
    const entryField = this.formDefinitions.formMetadata.fields[0];
    const fieldDefinitions: FieldEntryDefinition[] = this.formDefinitions.getEntryFieldDefs(entryField);

    const entryFieldItems: EntryFieldItem = { fieldProperty: entryField, fieldValues: fieldDefinitions.map(data => (data.id)) }

    // const entryObservations: CreateObservationModel[] = FormEntryUtil.getEntryObservationsForLinearLayout(
    //   this.formDefinitions, entryFieldItems, this.dbObservations, this.formDefinitions.formMetadata.convertDateTimeToUTC);

    const entryObservations: ObservationDefinition[] = this.formDefinitions.getEntryObsForLinearLayout();

    this.fieldDefinitions = fieldDefinitions;
    this.fieldDefinitionsChunks = this.getFieldDefsChunks(this.fieldDefinitions);
    this.observationsDefinitions = entryObservations;
    if (this.formDefinitions.formMetadata.validateTotal) {
      this.entryTotal = { value: FormEntryUtil.getTotal(this.observationsDefinitions, this.formDefinitions.formMetadata.elementsMetadata), errorMessage: '' };
    }

  }

  protected getObservationDef(fieldDef: FieldEntryDefinition): ObservationDefinition {
    const index: number = this.fieldDefinitions.findIndex(data => (data === fieldDef));
    return this.observationsDefinitions[index];
  }

  //todo. Push this to array utils
  private getFieldDefsChunks(fieldDefs: FieldEntryDefinition[]): FieldEntryDefinition[][] {
    const chunks: FieldEntryDefinition[][] = [];
    const chunkSize: number = 5;
    for (let i = 0; i < fieldDefs.length; i += chunkSize) {
      chunks.push(fieldDefs.slice(i, i + chunkSize));
    }
    return chunks;
  }


  protected onValueChange(): void {
    if (this.formDefinitions.formMetadata.validateTotal) {
      this.entryTotal.errorMessage = null;
      this.entryTotal.value = null;
    }

    this.enableSave.emit(!this.formDefinitions.formMetadata.validateTotal);
  }


  protected onInputBlur(entryObservation: CreateObservationModel): void {
    this.valueChange.emit(entryObservation);
  }

  protected onTotalValueChange(value: number | null): void {
    const expectedTotal = FormEntryUtil.getTotal(this.observationsDefinitions, this.formDefinitions.formMetadata.elementsMetadata);
    this.entryTotal.errorMessage = FormEntryUtil.checkTotal(expectedTotal, value);
    this.entryTotal.value = value;

    // If no error, then emit true. If error detected emit false
    this.enableSave.emit(this.entryTotal.errorMessage === null || this.entryTotal.errorMessage === '');
  }


}
