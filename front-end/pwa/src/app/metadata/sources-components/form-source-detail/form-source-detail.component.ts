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
import { FormSourcesService } from 'src/app/core/services/sources/form-sources.service';
import { ViewEntryFormModel } from 'src/app/core/models/sources/view-entry-form.model';
import { ViewSourceModel } from 'src/app/core/models/sources/view-source.model';

@Component({
  selector: 'app-form-source-detail',
  templateUrl: './form-source-detail.component.html',
  styleUrls: ['./form-source-detail.component.scss']
})
export class FormSourceDetailComponent implements OnInit {

  protected viewSource!: ViewSourceModel<ViewEntryFormModel>;
  protected sourceId: number = 0;
  protected formName: string = '';
  protected formDescription: string = '';

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
    private formSourcesService: FormSourcesService,
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
        this.sourceId = data.id;
        this.viewSource = data;
        this.setControlValues(data);
      });
    } else {
      this.sourceId = 0;
      this.viewSource = {
        id: 0,
        name: '',
        description: '',
        sourceType: SourceTypeEnum.FORM,
        sourceTypeName: SourceTypeEnum.FORM,
        extraMetadata: {
          selectors: ['DAY', 'HOUR'],
          fields: ['ELEMENT'],
          layout: 'LINEAR',
          elementIds: [],
          hours: [],
          period: 1440,
          utcDifference: 0,
          enforceLimitCheck: false,
          allowMissingValue: false,
          requireTotalInput: false,
          sampleImage: '',
          elementsMetadata: []
        }

      };
      this.pagesDataService.setPageHeader('New Form Definitions');
    }
  }

  private setControlValues(source: CreateUpdateSourceModel<ViewEntryFormModel>): void {
    this.formName = source.name;
    this.formDescription = this.viewSource.description;

    // Get form metadata
    // TODO. What should be done when this happens, though it's never expected
    if (!this.viewSource.extraMetadata) {
      return;
    }
    const entryForm: ViewEntryFormModel = this.viewSource.extraMetadata;

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
    this.utcDifference = entryForm.utcDifference;
    this.enforceLimitCheck = entryForm.enforceLimitCheck;
    this.allowMissingValue = entryForm.allowMissingValue;
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

    this.viewSource.sourceType = SourceTypeEnum.FORM;
    this.viewSource.name = this.formName;
    this.viewSource.description = this.formDescription;

    const entryForm: CreateEntryFormModel = {
      selectors: this.selectedSelectors.length === 1 ? [this.selectedSelectors[0]] : [this.selectedSelectors[0], this.selectedSelectors[1]],
      fields: this.selectedFields.length === 1 ? [this.selectedFields[0]] : [this.selectedFields[0], this.selectedFields[1]],
      layout: this.selectedLayout,
      elementIds: this.selectedElementIds,
      hours: this.selectedHourIds,
      period: this.selectedPeriodId,
      utcDifference: this.utcDifference,
      enforceLimitCheck: this.enforceLimitCheck,
      allowMissingValue : this.allowMissingValue,
      requireTotalInput: this.requireTotalInput,
      sampleImage: ''
    };

    const createUpdateSource: CreateUpdateSourceModel<CreateEntryFormModel> = {
      name: this.viewSource.name,
      description: this.viewSource.description,
      extraMetadata: entryForm,
      sourceType: SourceTypeEnum.FORM
    }

    if (this.sourceId === 0) {
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
      this.formSourcesService.update(this.sourceId, createUpdateSource).pipe(
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
    this.formSourcesService.delete(this.sourceId).subscribe((data) => {
      this.location.back();
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
