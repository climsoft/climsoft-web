import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { EntryForm } from '../../core/models/entryform.model';
import { DateUtils } from '../../shared/utils/date.utils';
import { Source } from '../../core/models/source.model';
import { ActivatedRoute } from '@angular/router';
import { SourcesService } from 'src/app/core/services/sources.service';

@Component({
  selector: 'app-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss']
})
export class FormBuilderComponent implements OnInit {
  source!: Source;

  allEntrySelectors: { [key: string]: any }[] = [{ id: 'year', name: 'Year' }, { id: "month", name: 'Month' }, { id: 'day', name: 'Day' }, { id: 'hour', name: 'Hour' }, { id: 'elementId', name: 'Element' }];;
  allEntryFields: { [key: string]: any }[] = [];
  selectedEntrySelectorIds: string[] = [];
  selectedEntryFieldIds: string[] = [];
  selectedEntryControlId: 'vf'|'grid' = 'vf';
  selectedElementIds: number[] = [];
  selectedHourIds: number[] = [];
  formName: string = '';
  formDescription: string = '';
  errorMessage: string = '';

  constructor(private sourceService: SourcesService, private location: Location, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['sourceid'];

    if (sourceId) {
      this.sourceService.getSource(sourceId).subscribe((data) => {
        this.setControlValues(data);
      });
    } else {
      this.setControlValues();
    }
  }

  private setControlValues(source?: Source) {

    if (source) {
      this.source = source;
      //get selection from data source
      this.formName = this.source.name;
      this.formDescription = this.source.description;
      const entryForm: EntryForm = this.getEntryForm(this.source.extraMetadata);
      this.selectedEntrySelectorIds = entryForm.entrySelectors;
      this.selectedElementIds = entryForm.elements;
      this.selectedHourIds = entryForm.hours;
    } else {
      //create new entry data source
      this.source = { id: 0, name: '', description: '', sourceTypeId: 1, extraMetadata: '' }
      //set entry selectors initial defaults
      this.selectedEntrySelectorIds = this.allEntrySelectors.slice(0, 4).map(item => item['id']);
      this.selectedHourIds = DateUtils.getHours().map(item => item['id']);
    }

    //set the control and the fields
    this.setEntryFieldsAndControl();
  }

  getEntryForm(entryFormJsonString: string): EntryForm {
    let entryForm: EntryForm;
    if (entryFormJsonString === undefined || entryFormJsonString === null || entryFormJsonString === '') {
      entryForm = {
        entrySelectors: [],
        entryFields: [],
        entryControl: 'vf',
        elements: [],
        hours: [],
        scale: 0,
        formValidations: '',
        samplePaperImage: '',
      };
    } else {
      entryForm = JSON.parse(entryFormJsonString);
    }

    return entryForm;
  }

  //changes the possible selection of entry fields and entry control
  setEntryFieldsAndControl(): void {

    //reset the possible entry fields to all entry selectors
    this.allEntryFields = [...this.allEntrySelectors];

    //remove selected entry selectors from the list of selectable entry fields
    //do not allow year and month as entry fields
    this.allEntryFields = this.allEntryFields.filter(item => !this.selectedEntrySelectorIds.includes(item['id']) && item['id'] !== 'year' && item['id'] !== 'month');

    //set the new entry fields as the selected ones
    this.selectedEntryFieldIds = this.allEntryFields.map(item => item['id']);

    //set entry control
    this.setEntryControl();

  }

  setEntryControl(): void {
    if (this.selectedEntryFieldIds.length === 1) {
      this.selectedEntryControlId = 'vf';
    } else if (this.selectedEntryFieldIds.length === 2) {
      this.selectedEntryControlId = 'grid';
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

    if (!this.entrySelectorsValid()) {
      this.errorMessage = 'Select valid entry selectors';
      return;
    }

    if (!this.entryFieldsValid()) {
      this.errorMessage = 'Select valid entry fields';
      return;
    }

    if (this.selectedElementIds.length === 0) {
      this.errorMessage = 'Select elements';
    }

    if (this.selectedHourIds.length === 0) {
      this.errorMessage = 'Select hours';
    }

    this.source.sourceTypeId = 1; 
    this.source.name = this.formName;
    this.source.description = this.formDescription;

    const entryForm: EntryForm = this.getEntryForm('');
    entryForm.entrySelectors = this.selectedEntrySelectorIds;
    entryForm.entryFields = this.selectedEntryFieldIds;
    entryForm.entryControl = this.selectedEntryControlId;
    entryForm.elements = this.selectedElementIds;
    entryForm.hours = this.selectedHourIds;

    this.source.extraMetadata = JSON.stringify(entryForm);

    if(this.source.id === 0){
      this.sourceService.createSource(this.source).subscribe((data) => {
        this.location.back();
      });
    }else{
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

  entrySelectorsValid(): boolean {
    //must be a minimum of 4 and maximum of 5
    return this.selectedEntrySelectorIds.length >= 3 && this.selectedEntrySelectorIds.length <= 4;
  }

  entryFieldsValid(): boolean {
    //must be a minimum of 1 or maximum of 2 depending on the selectors
    if (this.selectedEntrySelectorIds.length === 4) {
      return this.selectedEntryFieldIds.length === 1;
    } else if (this.selectedEntrySelectorIds.length === 3) {
      return this.selectedEntryFieldIds.length === 2;
    } else {
      return false;
    }
  }



}
