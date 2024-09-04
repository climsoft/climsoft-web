// TODO. Try using angular forms?

import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ExtraSelectorControlType, CreateEntryFormModel, LayoutType, } from '../../../core/models/sources/create-entry-form.model';
import { CreateUpdateSourceModel } from '../../../core/models/sources/create-update-source.model';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SourceTypeEnum } from 'src/app/core/models/sources/source-type.enum';
import { take } from 'rxjs';
import { ViewEntryFormModel } from 'src/app/core/models/sources/view-entry-form.model';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';
import { SourcesService } from 'src/app/core/services/sources/sources.service';

@Component({
  selector: 'app-form-source-detail',
  templateUrl: './form-source-detail.component.html',
  styleUrls: ['./form-source-detail.component.scss']
})
export class FormSourceDetailComponent implements OnInit {

  protected viewSource!: ViewSourceModel;

  protected possibleSelectors: ExtraSelectorControlType[] = ['ELEMENT', 'DAY', 'HOUR'];
  protected possibleFields: ExtraSelectorControlType[] = ['ELEMENT', 'DAY', 'HOUR'];

  protected selectedSelectors: ExtraSelectorControlType[] = [];
  protected selectedFields: ExtraSelectorControlType[] = [];
  protected selectedLayout: LayoutType = 'LINEAR';
  protected selectedElementIds: number[] = [];
  protected possibleHourIds: number[] = [];
  protected selectedHourIds: number[] = [];
  protected selectedPeriodId: number | null = null;
  protected utcDifference: number = 0;
  protected enforceLimitCheck: boolean = true;
  protected allowMissingValue: boolean = false;
  protected requireTotalInput: boolean = false;
  protected selectorsErrorMessage: string = '';
  protected fieldsErrorMessage: string = '';
  protected elementsErrorMessage: string = '';
  protected hoursErrorMessage: string = '';
  protected periodErrorMessage: string = '';
  protected errorMessage: string = '';

  constructor(
    private pagesDataService: PagesDataService,
    private formSourcesService: SourcesService,
    private location: Location,
    private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['id'];
    if (StringUtils.containsNumbersOnly(sourceId)) {
      this.pagesDataService.setPageHeader('Edit Form Definitions');
      // Todo. handle errors where the source is not found for the given id
      this.formSourcesService.findOne(sourceId).pipe(
        take(1)
      ).subscribe((data) => {
        this.viewSource = data;
        this.setControlValues(this.viewSource.definitions as ViewEntryFormModel);
      });
    } else {
      const entryForm: ViewEntryFormModel = { selectors: ['DAY', 'HOUR'], fields: ['ELEMENT'], layout: 'LINEAR', elementIds: [], hours: [], period: 1440, enforceLimitCheck: false, requireTotalInput: false, elementsMetadata: [], isValid: () => true }
      this.viewSource = { id: 0, name: '', description: '', sourceType: SourceTypeEnum.FORM, utcOffset: 0, allowMissingValue: false, sampleImage: '', definitions: entryForm };
      this.pagesDataService.setPageHeader('New Form Definitions');
    }
  }

  private setControlValues(entryForm: ViewEntryFormModel): void {
    const selectedSelectors: ExtraSelectorControlType[] = [];
    const possibleFields: ExtraSelectorControlType[] = [];
    const selectedFields: ExtraSelectorControlType[] = [];

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
    this.utcDifference = this.viewSource.utcOffset;
    this.enforceLimitCheck = entryForm.enforceLimitCheck;
    this.allowMissingValue = this.viewSource.allowMissingValue;
    this.requireTotalInput = entryForm.requireTotalInput;
  }

  public onSelectorsSelected(selectedSelectors: ExtraSelectorControlType[]): void {

    if (!this.validSelectors(selectedSelectors)) {
      return;
    }

    this.selectedSelectors = selectedSelectors;

    //remove selected selector from the list of selectable entry fields
    this.possibleFields = this.possibleSelectors.filter(data => !selectedSelectors.includes(data));
    this.selectedFields = [];
    this.selectedLayout = this.getLayout(this.selectedFields);
  }

  public onFieldsSelected(selectedFields: ExtraSelectorControlType[]): void {

    if (!this.validFields(this.selectedSelectors, selectedFields)) {
      return;
    }

    this.selectedFields = selectedFields;
    this.selectedLayout = this.getLayout(this.selectedFields);
  }

  private getLayout(fields: ExtraSelectorControlType[]): LayoutType {
    return fields.length === 2 ? 'GRID' : 'LINEAR';
  }

  protected onPeriodSelected(periodId: number | null) {
    this.selectedPeriodId = periodId;
    this.selectedHourIds = [];
    this.periodErrorMessage = this.selectedPeriodId === null ? 'Select period' : '';
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

    if (!this.viewSource) {
      this.errorMessage = 'Form not defined';
      return;
    }

    if (!this.viewSource.name) {
      this.errorMessage = 'Enter form name';
      return;
    }

    if (!this.viewSource.description) {
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

    const entryForm: CreateEntryFormModel = {
      selectors: this.selectedSelectors.length === 1 ? [this.selectedSelectors[0]] : [this.selectedSelectors[0], this.selectedSelectors[1]],
      fields: this.selectedFields.length === 1 ? [this.selectedFields[0]] : [this.selectedFields[0], this.selectedFields[1]],
      layout: this.selectedLayout,
      elementIds: this.selectedElementIds,
      hours: this.selectedHourIds,
      period: this.selectedPeriodId,
      enforceLimitCheck: this.enforceLimitCheck,
      requireTotalInput: this.requireTotalInput,
      isValid: () => true
    };

    const createUpdateSource: CreateUpdateSourceModel = {
      name: this.viewSource.name,
      description: this.viewSource.description,
      sourceType: SourceTypeEnum.FORM,
      utcOffset: this.utcDifference,
      allowMissingValue: this.allowMissingValue,
      sampleImage: '',
      definitions: entryForm
    }

    if (this.viewSource.id === 0) {
      this.formSourcesService.create(createUpdateSource).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Form Definitions', message: `Form ${this.viewSource.name} definitions saved`, type: 'success'
          });
          this.location.back();
        }
      });
    } else {
      this.formSourcesService.update(this.viewSource.id, createUpdateSource).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Form Definitions', message: `Form  ${this.viewSource.name} definitions updated`, type: 'success'
          });
          this.location.back();
        }
      });
    }

  }

  protected onDelete(): void {
    //todo. prompt for confirmation first
    this.formSourcesService.delete(this.viewSource.id).subscribe((data) => {
      if(data){
        this.location.back();
      }else{
        //TODO. Show error
      }
      
    });

  }

  protected onCancel(): void {
    this.location.back();
  }

  private validSelectors(selectors: ExtraSelectorControlType[]): boolean {
    this.selectorsErrorMessage = '';
    if (selectors.length === 0) {
      this.selectorsErrorMessage = 'Selector(s) required';
    } else if (selectors.length > 2) {
      this.selectorsErrorMessage = 'Maximum selectors allowed are 2';
    }

    return this.selectorsErrorMessage === '';
  }

  private validFields(selectors: ExtraSelectorControlType[], fields: ExtraSelectorControlType[]): boolean {
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
