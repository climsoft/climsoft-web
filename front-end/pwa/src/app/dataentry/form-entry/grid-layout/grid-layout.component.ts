import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core'; 
import { CreateEntryFormModel } from 'src/app/core/models/sources/create-entry-form.model';
import { ViewElementModel } from 'src/app/core/models/elements/view-element.model'; 
import { EntryFieldItem,  FormEntryUtil } from '../form-entry.util';
import { CreateObservationModel } from 'src/app/core/models/observations/create-observation.model';
import { FormEntryDefinition } from '../form-entry.definition';
import { FieldEntryDefinition } from '../field.definition';

@Component({
  selector: 'app-grid-layout',
  templateUrl: './grid-layout.component.html',
  styleUrls: ['./grid-layout.component.scss']
})
export class GridLayoutComponent implements OnInit, OnChanges {
  @Input() formDefinitions!: FormEntryDefinition;
  @Input() dbObservations!: CreateObservationModel[];
  @Output() valueChange = new EventEmitter<CreateObservationModel>();
  @Output() public enableSave = new EventEmitter<boolean>();

  protected rowFieldDefinitions!: FieldEntryDefinition[];
  protected colFieldDefinitions!: FieldEntryDefinition[];
  protected newObservations!: CreateObservationModel[][];
  protected entryTotals!: { value: number | null, errorMessage: string | null }[];
 

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //only proceed with seting up the control if all inputs have been set.
    if (this.formDefinitions && this.dbObservations) {
      this.setup();
    } else {
      this.newObservations = [];
    }

  }



  private setup(): void {

    if (this.formDefinitions.formMetadata.fields.length < 0 || !this.formDefinitions.formMetadata.fields[1]) {
      return;
    }

    const rowFieldDefs: FieldEntryDefinition[] = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[0]);
    const colFieldDefs: FieldEntryDefinition[] = this.formDefinitions.getEntryFieldDefs(this.formDefinitions.formMetadata.fields[1]);
    const entryObservations: CreateObservationModel[][] = this.formDefinitions.getEntryObsForGridLayout();

    this.rowFieldDefinitions = rowFieldDefs;
    this.colFieldDefinitions = colFieldDefs;
    this.newObservations = entryObservations;


    if (this.formDefinitions.formMetadata.validateTotal) {
      const entryTotals = [];
      for (let colIndex = 0; colIndex < this.colFieldDefinitions.length; colIndex++) {
        entryTotals.push({ value: this.getColumnTotal(colIndex), errorMessage: '' });
      }
      this.entryTotals = entryTotals;

    }
  }

  protected get rowHeaderName(): string{
    return this.formDefinitions.formMetadata.fields[0]
  }

  protected getEntryObservation(rowIndex: number, colIndex: number): CreateObservationModel {
    return this.newObservations[rowIndex][colIndex];
  }

  protected onValueChange(colIndex: number): void {
    if (this.formDefinitions.formMetadata.validateTotal) {
      const entryTotal = this.entryTotals[colIndex];
      entryTotal.errorMessage = null;
      entryTotal.value = null;
    }

    this.enableSave.emit(!this.formDefinitions.formMetadata.validateTotal);
  }


  protected onInputBlur(entryObservation: CreateObservationModel): void {
    this.valueChange.emit(entryObservation);
  }

  protected onTotalValueChange(colIndex: number, value: number | null): void {
    this.entryTotals[colIndex].value = value;
    // If no error, then emit true
    // if error detected emit false
    this.enableSave.emit(this.allColumnTotalsValid());
  }


  private getColumnTotal(colIndex: number): number | null {
    const colObservations: CreateObservationModel[] = []
    for (let rowIndex = 0; rowIndex < this.rowFieldDefinitions.length; rowIndex++) {
      colObservations.push(this.newObservations[rowIndex][colIndex]);
    }
    return FormEntryUtil.getTotal(colObservations, this.formDefinitions.formMetadata.elementsMetadata);
  }

  private allColumnTotalsValid(): boolean {
    for (let colIndex = 0; colIndex < this.colFieldDefinitions.length; colIndex++) {
      const expectedTotal = this.getColumnTotal(colIndex);
      const entryTotal = this.entryTotals[colIndex];
      entryTotal.errorMessage = FormEntryUtil.checkTotal(expectedTotal, entryTotal.value);
      if (entryTotal.errorMessage) {
        return false;
      }
    }

    return true;
  }

}
