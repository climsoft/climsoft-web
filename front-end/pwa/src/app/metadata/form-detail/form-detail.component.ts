import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { FieldType, FieldsType, EntryForm, LayoutType, SelectorType, SelectorsType } from '../../core/models/entry-form.model';
import { DateUtils } from '../../shared/utils/date.utils';
import { SourceModel } from '../../core/models/source.model';
import { ActivatedRoute } from '@angular/router';
import { SourcesService } from 'src/app/core/services/sources.service';

@Component({
  selector: 'app-form-detail',
  templateUrl: './form-detail.component.html',
  styleUrls: ['./form-detail.component.scss']
})
export class FormDetailComponent {

  protected source!: SourceModel;
  protected formName: string = '';
  protected formDescription: string = '';
  protected possibleSelectors: SelectorType[] = ['ELEMENT', 'YEAR', 'MONTH', 'DAY', 'HOUR'];
  protected possibleFields: FieldsType | null = null;
  protected selectedSelectors: SelectorsType | null = null;
  protected selectedFields: FieldsType | null = null;
  protected selectedLayout: LayoutType | null = null;
  protected selectedElements: number[] = [];
  protected selectedHours: number[] = [];
  protected selectedPeriod: number = 0;
  protected validateTotal: boolean = false;
  protected errorMessage: string = '';

  constructor(private sourceService: SourcesService, private location: Location, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['sourceid'];
    if (sourceId) {
      // Todo. handle errors where the source is not found for the given id
      this.sourceService.getSource(sourceId).subscribe((data) => {

        this.source = data;
        this.setControlValues(data);
      });
    } else {
      this.source = { id: 0, name: '', description: '', sourceTypeId: 1, extraMetadata: '' }
      this.selectedHours = DateUtils.getHours().map(item => item['id']);
    }
  }

  private setControlValues(source: SourceModel) {
    this.formName = source.name;
    this.formDescription = this.source.description;

    // Get form metadata
    const entryForm: EntryForm = JSON.parse(this.source.extraMetadata);
    this.selectedSelectors = entryForm.selectors;
    //set possible fields so that selected fields can show up
    this.possibleFields = entryForm.fields
    this.selectedFields = entryForm.fields;
    this.selectedLayout = entryForm.layout;
    this.selectedElements = entryForm.elements;
    this.selectedHours = entryForm.hours;
    this.selectedPeriod = entryForm.period;
    this.validateTotal= entryForm.validateTotal;
  }

  public onSelectorsSelected(newSelectedSelectors: SelectorType[]): void {

    //console.log('cycle', newSelectedSelectors);

    //reset previous selected entry selectors and all entry fields
    this.selectedSelectors = null;
    this.possibleFields = null;
    this.selectedFields = null;

    if (!(newSelectedSelectors.length >= 3 && newSelectedSelectors.length <= 4)) {
      return;
    }

    //set possible selectable selectors
    if (newSelectedSelectors.length === 3) {
      this.selectedSelectors = [newSelectedSelectors[0], newSelectedSelectors[1], newSelectedSelectors[2]];
    } else if (newSelectedSelectors.length === 4) {
      this.selectedSelectors = [newSelectedSelectors[0], newSelectedSelectors[1], newSelectedSelectors[2], newSelectedSelectors[3]];
    }

    //remove selected entry selectors from the list of selectable entry fields
    let allPossibleFields: FieldType[] = ['ELEMENT', 'DAY', 'HOUR'];
    allPossibleFields = allPossibleFields.filter(item => !newSelectedSelectors.includes(item));
    if (allPossibleFields.length == 1) {
      this.possibleFields = [allPossibleFields[0]];
    } else if (allPossibleFields.length == 2) {
      this.possibleFields = [allPossibleFields[0], allPossibleFields[1]];
    }

    this.selectedLayout = this.getLayout(this.selectedSelectors, this.selectedFields);
  }

  public onFieldsSelected(newSelectedFields: FieldType[]): void {

    if (newSelectedFields.length === 1) {
      this.selectedFields = [newSelectedFields[0]];
    } else if (newSelectedFields.length === 2) {
      this.selectedFields = [newSelectedFields[0], newSelectedFields[1]];
    } else {
      this.selectedFields = null;
    }

    this.selectedLayout = this.getLayout(this.selectedSelectors, this.selectedFields);
  }


  private getLayout(selectors: SelectorsType | null, fields: FieldsType | null): LayoutType | null {

    if (!this.selectorsValid(selectors)) {
      return null;
    }

    if (fields === null || !this.fieldsValid(selectors, fields)) {
      return null;
    }

    // 1 field should give a linear layout
    // 2 fields should give a grid layout
    switch (fields.length) {
      case 1:
        return 'LINEAR';
      case 2:
        return 'GRID';
      default:
        return null;
    }
  }

  onSave(): void {

    if (!this.formName) {
      this.errorMessage = 'Enter form name';
      return;
    }

    if (!this.formDescription) {
      this.errorMessage = 'Enter form description';
      return;
    }

    if (this.selectedSelectors === null || !this.selectorsValid(this.selectedSelectors)) {
      this.errorMessage = 'Select valid entry selectors';
      return;
    }

    if (this.selectedFields === null || !this.fieldsValid(this.selectedSelectors, this.selectedFields)) {
      this.errorMessage = 'Select valid entry fields';
      return;
    }

    if (this.selectedLayout === null) {
      this.errorMessage = 'Select layout';
      return;
    }

    if (this.selectedElements.length === 0) {
      this.errorMessage = 'Select elements';
      return;
    }

    if (this.selectedHours.length === 0) {
      this.errorMessage = 'Select hours';
      return;
    }

    if (!this.source) {
      this.errorMessage = 'Form not defined';
      return;
    }

    this.source.sourceTypeId = 1;
    this.source.name = this.formName;
    this.source.description = this.formDescription;

    const entryForm: EntryForm = {
      selectors: this.selectedSelectors,
      fields: this.selectedFields, layout: this.selectedLayout,
      elements: this.selectedElements, hours: this.selectedHours,
      period: this.selectedPeriod, validateTotal: this.validateTotal,
      samplePaperImage: ''
    };

    this.source.extraMetadata = JSON.stringify(entryForm);

    if (this.source.id === 0) {
      this.sourceService.createSource(this.source).subscribe((data) => {
        this.location.back();
      });
    } else {
      this.sourceService.updateSource(this.source).subscribe((data) => {
        this.location.back();
      });
    }


  }

  onCancel(): void {
    this.location.back();
  }

  onDelete(): void {
    //todo. prompt for confirmation first
    this.sourceService.deleteSource(this.source.id).subscribe((data) => {
      this.location.back();
    });

  }

  selectorsValid(possibleSelectors: SelectorsType | null): boolean {
    // must be a minimum of 4 and maximum of 5 selectors
    return possibleSelectors !== null && possibleSelectors.length >= 3 && possibleSelectors.length <= 4;
  }

  fieldsValid(possibleSelectors: SelectorsType | null, possibleFields: FieldsType | null): boolean {
    // 4 selectors should be accompanied by 1 field
    // 3 selectors should be accompanied by 2 fields
    return (possibleSelectors !== null && possibleFields !== null) &&
      ((possibleSelectors.length === 4 && possibleFields.length === 1) ||
        (possibleSelectors.length === 3 && possibleFields.length === 2));
  }

}
