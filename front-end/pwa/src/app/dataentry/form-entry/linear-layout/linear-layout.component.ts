import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';  
import { EntryForm } from 'src/app/core/models/entry-form.model';
import { ElementModel } from 'src/app/core/models/element.model';
import { EntryFieldItem, EntryFormFilter, FormEntryUtil } from '../form-entry.util';
import { ViewPortSize, ViewportService } from 'src/app/core/services/viewport.service'; 
import { CreateObservationModel } from 'src/app/core/models/create-observation.model';

@Component({
  selector: 'app-linear-layout',
  templateUrl: './linear-layout.component.html',
  styleUrls: ['./linear-layout.component.scss']
})
export class LnearLayoutComponent implements OnInit, OnChanges {
  @Input() public elements!: ElementModel[];
  @Input() public formFilter!: EntryFormFilter;
  @Input() public formMetadata!: EntryForm;
  @Input() public dbObservations!: CreateObservationModel[];
  @Output() public valueChange = new EventEmitter<CreateObservationModel>();
  @Output() public enableSave = new EventEmitter<boolean>();

  // Todo, change this to a typed interface
  protected fieldDefinitions!: [number, string][];
  protected fieldDefinitionsChunks!: [number, string][][];
  protected entryObservations!: CreateObservationModel[];
  protected entryTotal!: { value: number | null, errorMessage: string | null };
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
      this.formFilter && this.formMetadata ) {

      // Get the new definitions 
      this.setup();
    } else {
      this.entryObservations = [];
    }

  }

  private setup(): void {
    //get entry field to use for control definitions
    const entryField = this.formMetadata.fields[0];
    const fieldDefinitions: [number, string][] = FormEntryUtil.getEntryFieldDefs(
      entryField, this.elements, this.formFilter.year, this.formFilter.month, this.formMetadata.hours
    );
    const entryFieldItems: EntryFieldItem = { fieldProperty: entryField, fieldValues: fieldDefinitions.map(data => (data[0])) }
    const entryObservations: CreateObservationModel[] = FormEntryUtil.getEntryObservationsForLinearLayout(this.formFilter, entryFieldItems, this.dbObservations);

    this.fieldDefinitions = fieldDefinitions;
    this.fieldDefinitionsChunks = this.getFieldDefsChunks(this.fieldDefinitions);
    this.entryObservations = entryObservations;
    if (this.formMetadata.validateTotal) {
      this.entryTotal = { value: FormEntryUtil.getTotal(this.entryObservations, this.elements), errorMessage: '' };
    }

   /// console.log("fieldDefinitions",this.fieldDefinitions)
   // console.log("fieldDefinitionsChunks",this.fieldDefinitionsChunks)
    //console.log("entryObservations",this.entryObservations)

  }

  protected getEntryObservation(fieldDef: [number, string]): CreateObservationModel {
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

  protected onValueChange(): void {
    if (this.formMetadata.validateTotal) {
      this.entryTotal.errorMessage = null;
      this.entryTotal.value = null;
    }
    
    this.enableSave.emit(!this.formMetadata.validateTotal);
  }
  

  protected onInputBlur(entryObservation: CreateObservationModel): void {
    this.valueChange.emit(entryObservation);
  }

  protected onTotalValueChange(value: number | null): void {
    const expectedTotal = FormEntryUtil.getTotal(this.entryObservations, this.elements);
    this.entryTotal.errorMessage = FormEntryUtil.checkTotal(expectedTotal, value);
    this.entryTotal.value = value;

    // If no error, then emit true. If error detected emit false
    this.enableSave.emit(this.entryTotal.errorMessage === null || this.entryTotal.errorMessage === '');
  }


}
