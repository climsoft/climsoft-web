// TODO. Try using angular forms?

import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { EntryType, EntryForm, LayoutType, } from '../../core/models/entry-form.model';
import { SourceModel } from '../../core/models/source.model';
import { ActivatedRoute } from '@angular/router';
import { SourcesService } from 'src/app/core/services/sources.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-form-detail',
  templateUrl: './form-detail.component.html',
  styleUrls: ['./form-detail.component.scss']
})
export class FormDetailComponent implements OnInit {

  protected source!: SourceModel;
  protected formName: string = '';
  protected formDescription: string = '';

  protected possibleSelectors: EntryType[] = ['ELEMENT', 'DAY', 'HOUR'];
  protected possibleFields: EntryType[] = ['ELEMENT', 'DAY', 'HOUR'];

  protected selectedSelectors: EntryType[] = [];
  protected selectedFields: EntryType[] = [];
  protected selectedLayout: LayoutType = 'LINEAR';
  protected selectedElementIds: number[] = [];
  protected possibleHourIds: number[] = [];
  protected selectedHourIds: number[] = [];
  protected selectedPeriodId: number | null = null;
  protected validateTotal: boolean = false;
  protected selectorsErrorMessage: string = '';
  protected fieldsErrorMessage: string = '';
  protected elementsErrorMessage: string = '';
  protected hoursErrorMessage: string = '';
  protected periodErrorMessage: string = '';
  protected errorMessage: string = '';

  constructor(  private pagesDataService: PagesDataService,
    private sourceService: SourcesService, private location: Location, private route: ActivatedRoute) {    
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['sourceid'];
    if (StringUtils.containsNumbersOnly(sourceId) ) {
      this.pagesDataService.setPageHeader('Edit Entry Form');
      // Todo. handle errors where the source is not found for the given id
      this.sourceService.getSource(sourceId).subscribe((data) => {
        this.source = data;
        this.setControlValues(data);
      });
    } else {
      this.source = { id: 0, name: '', description: '', sourceTypeId: 1, extraMetadata: '' };
      this.pagesDataService.setPageHeader('New Entry Form');
    }
  }

  private setControlValues(source: SourceModel) {
    this.formName = source.name;
    this.formDescription = this.source.description;

    // Get form metadata
    const entryForm: EntryForm = JSON.parse(this.source.extraMetadata);

    const selectedSelectors: EntryType[] = [];
    const possibleFields: EntryType[] = [];
    const selectedFields: EntryType[] = [];

    for (const s of entryForm.selectors) {
      if (s) {
        selectedSelectors.push(s);
      }
    }

    for (const f of entryForm.fields) {
      if (f) {
        possibleFields.push(f);
        selectedFields.push(f);
      }
    }

    this.selectedSelectors = selectedSelectors;
    this.possibleFields = possibleFields;
    this.selectedFields = selectedFields;
    this.selectedLayout = entryForm.layout;
    this.selectedElementIds = entryForm.elementIds;
    this.selectedHourIds = entryForm.hours;
    this.selectedPeriodId = entryForm.period;
    this.validateTotal = entryForm.validateTotal;
  }

  public onSelectorsSelected(selectedSelectors: EntryType[]): void {

    if (!this.validSelectors(selectedSelectors)) {
      return;
    }

    this.selectedSelectors = selectedSelectors;

    //remove selected selector from the list of selectable entry fields
    this.possibleFields = this.possibleSelectors.filter(data => !selectedSelectors.includes(data));
    this.selectedFields = [];
    this.selectedLayout = this.getLayout(this.selectedFields);
  }



  public onFieldsSelected(selectedFields: EntryType[]): void {

    if (!this.validFields(this.selectedSelectors, selectedFields)) {
      return;
    }

    this.selectedFields = selectedFields;
    this.selectedLayout = this.getLayout(this.selectedFields);

  }

  private getLayout(fields: EntryType[]): LayoutType {
    return fields.length === 2 ? 'GRID' : 'LINEAR';
  }

  protected onPeriodSelected(periodId: number | null) {
    this.selectedPeriodId = periodId;
    this.selectedHourIds = [];
    this.periodErrorMessage = this.selectedPeriodId === null? 'Select period':''; 
  }

  protected onHoursSelected(hourIds: number[]) {
    this.hoursErrorMessage = '';

    if (this.selectedPeriodId === 1440 && hourIds.length !== 1) {
      // for 24 hours
      this.hoursErrorMessage = '1 hour expected only';
    } else if (this.selectedPeriodId === 720 && hourIds.length !== 2) {
      //for 12 hour
      this.hoursErrorMessage = '2 hours expected only';
    } else if (this.selectedPeriodId === 360 && hourIds.length !== 4) {
      //for 6 hours
      this.hoursErrorMessage = '4 hours expected only';
    } else if (this.selectedPeriodId === 180 && hourIds.length !== 8) {
      //for 3 hours
      this.hoursErrorMessage = '8 hours expected only';
    }

    if (this.hoursErrorMessage) {
      this.selectedHourIds = hourIds;
    }

  }

  protected onSave(): void {

    if (!this.source) {
      this.errorMessage = 'Form not defined';
      return;
    }

    if (!this.formName) {
      this.errorMessage = 'Enter form name';
      return;
    }

    if (!this.formDescription) {
      this.errorMessage = 'Enter form description';
      return;
    }

    if (!this.validSelectors(this.selectedSelectors)) {
      this.errorMessage = 'Select valid selectors';
      return;
    }

    if (!this.validFields(this.selectedSelectors, this.selectedFields)) {
      this.errorMessage = 'Select valid fields';
      return;
    }

    if (!this.selectedLayout) {
      this.errorMessage = 'Select valid layout';
      return;
    }

    if (this.selectedElementIds.length === 0) {
      this.elementsErrorMessage = 'Select elements';
      return;
    }

    if (!this.selectedPeriodId) {
      this.errorMessage = 'Select period';
      return;
    }

    if (this.selectedHourIds.length === 0) {
      this.hoursErrorMessage = 'Select hours';
      return;
    }

    this.source.sourceTypeId = 1;
    this.source.name = this.formName;
    this.source.description = this.formDescription;

    const entryForm: EntryForm = {
      selectors: this.selectedSelectors.length === 1 ? [this.selectedSelectors[0]] : [this.selectedSelectors[0], this.selectedSelectors[1]],
      fields: this.selectedFields.length === 1 ? [this.selectedFields[0]] : [this.selectedFields[0], this.selectedFields[1]],
      layout: this.selectedLayout,
      elementIds: this.selectedElementIds, hours: this.selectedHourIds,
      period: this.selectedPeriodId, validateTotal: this.validateTotal,
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

  protected onCancel(): void {
    this.location.back();
  }

  protected onDelete(): void {
    //todo. prompt for confirmation first
    this.sourceService.deleteSource(this.source.id).subscribe((data) => {
      this.location.back();
    });

  }

  private validSelectors(selectors: EntryType[]): boolean {
    this.selectorsErrorMessage = '';
    if (selectors.length === 0) {
      this.selectorsErrorMessage = 'Selector(s) required';
    } else if (selectors.length > 2) {
      this.selectorsErrorMessage = 'Maximum selectors allowed are 2';
    }

    return this.selectorsErrorMessage === '';
  }

  private validFields(selectors: EntryType[], fields: EntryType[]): boolean {
    this.fieldsErrorMessage = '';

    if (!this.validSelectors(selectors)) {
      this.fieldsErrorMessage = 'Invalid selectors';
      return false;
    }

    if (fields.length === 0) {
      this.fieldsErrorMessage = 'Fields(s) required';
    } else if (selectors.length == 1 && fields.length !== 2) {
      this.fieldsErrorMessage = '2 Fields required';
    } else if (selectors.length == 2 && fields.length !== 1) {
      this.fieldsErrorMessage = '1 Field required';
    }

    return this.fieldsErrorMessage === '';
  }

}
