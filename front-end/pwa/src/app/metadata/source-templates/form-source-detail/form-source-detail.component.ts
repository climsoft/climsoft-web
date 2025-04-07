import { Component, OnDestroy, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ExtraSelectorControlType, CreateEntryFormModel, LayoutType, } from '../models/create-entry-form.model';
import { CreateUpdateSourceModel } from '../models/create-update-source.model';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SourceTypeEnum } from 'src/app/metadata/source-templates/models/source-type.enum';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-templates/models/view-source.model';
import { SourceTemplatesCacheService } from '../services/source-templates-cache.service';

// TODO. Try using angular forms?

@Component({
  selector: 'app-form-source-detail',
  templateUrl: './form-source-detail.component.html',
  styleUrls: ['./form-source-detail.component.scss']
})
export class FormSourceDetailComponent implements OnInit, OnDestroy {

  protected viewSource!: ViewSourceModel;

  protected possibleSelectors: ExtraSelectorControlType[] = ['ELEMENT', 'DAY', 'HOUR'];
  protected possibleFields: ExtraSelectorControlType[] = ['ELEMENT', 'DAY', 'HOUR'];

  protected selectedSelectors: ExtraSelectorControlType[] = [];
  protected selectedFields: ExtraSelectorControlType[] = [];
  protected selectedLayout: LayoutType = 'LINEAR';
  protected selectedElementIds: number[] = [];
  protected possibleHourIds: number[] = [];
  protected selectedHourIds: number[] = [];
  protected selectedIntervalId: number | null = null;
  protected utcOffset: number = 0;
  protected allowMissingValue: boolean = true;
  protected requireTotalInput: boolean = false;
  protected allowIntervalEditing: boolean = false;
  protected allowStationSelection: boolean = false;
  protected selectorsErrorMessage: string = '';
  protected fieldsErrorMessage: string = '';
  protected elementsErrorMessage: string = '';
  protected hoursErrorMessage: string = '';
  protected intervalErrorMessage: string = '';
  protected errorMessage: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private sourcesCacheService: SourceTemplatesCacheService,
    private location: Location,
    private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    const sourceId = this.route.snapshot.params['id'];
    if (StringUtils.containsNumbersOnly(sourceId)) {
      this.pagesDataService.setPageHeader('Edit Form Template');
      this.sourcesCacheService.findOne(+sourceId).pipe(
        takeUntil(this.destroy$),
      ).subscribe(data => {
        if (data) {
          this.viewSource = data;
          this.setControlValues(this.viewSource.parameters as CreateEntryFormModel);
        }
      });
    } else {
      this.pagesDataService.setPageHeader('New Form Template');
      const entryForm: CreateEntryFormModel = { selectors: ['DAY', 'HOUR'], fields: ['ELEMENT'], layout: 'LINEAR', elementIds: [], hours: [], interval: 1440, requireTotalInput: false, allowIntervalEditing: false, allowStationSelection: false, isValid: () => true }
      this.viewSource = {
        id: 0,
        name: '',
        description: '',
        sourceType: SourceTypeEnum.FORM,
        utcOffset: 0,
        allowMissingValue: true,
        scaleValues: true, // By default forms usually have scaled values.
        sampleImage: '',
        parameters: entryForm,
        disabled: false,
        comment: '',
      };
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setControlValues(entryForm: CreateEntryFormModel): void {
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
    this.selectedIntervalId = entryForm.interval;
    this.utcOffset = this.viewSource.utcOffset;
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

  protected onIntervalSelected(intervalId: number | null) {
    this.selectedIntervalId = intervalId;
    this.selectedHourIds = [];
    this.intervalErrorMessage = this.selectedIntervalId === null ? 'Select interval' : '';
  }

  protected onHoursSelected(hourIds: number[]) {
    this.hoursErrorMessage = '';

    if (this.selectedIntervalId === 1440 && hourIds.length !== 1) {
      // for 24 hours
      this.hoursErrorMessage = '1 hour expected only';
    } else if (this.selectedIntervalId === 720 && hourIds.length !== 2) {
      //for 12 hour
      this.hoursErrorMessage = '2 hours expected only';
    } else if (this.selectedIntervalId === 360 && hourIds.length !== 4) {
      //for 6 hours
      this.hoursErrorMessage = '4 hours expected only';
    } else if (this.selectedIntervalId === 180 && hourIds.length !== 8) {
      //for 3 hours
      this.hoursErrorMessage = '8 hours expected only';
    }

    if (this.hoursErrorMessage) {
      this.selectedHourIds = hourIds;
    }

  }

  protected onSave(): void {
    this.errorMessage = '';

    if (!this.viewSource) {
      this.errorMessage = 'Template not defined';
      return;
    }

    if (!this.viewSource.name) {
      this.errorMessage = 'Enter template name';
      return;
    }

    if (!this.viewSource.description) {
      this.errorMessage = 'Enter template description';
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

    if (!this.selectedIntervalId) {
      this.errorMessage = 'Select interval';
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
      interval: this.selectedIntervalId,
      requireTotalInput: this.requireTotalInput,
      allowIntervalEditing: this.allowIntervalEditing,
      allowStationSelection: this.allowStationSelection,
      isValid: () => true
    };

    const createUpdateSource: CreateUpdateSourceModel = {
      name: this.viewSource.name,
      description: this.viewSource.description,
      sourceType: SourceTypeEnum.FORM,
      utcOffset: this.utcOffset,
      allowMissingValue: this.allowMissingValue,
      sampleImage: '',
      parameters: entryForm,
      scaleValues: true, // By default form values are always scaled.
      disabled: this.viewSource.disabled,
      comment: this.viewSource.comment,
    }

    if (this.viewSource.id === 0) {
      this.sourcesCacheService.put(createUpdateSource).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Form Template', message: `Form ${this.viewSource.name} template saved`, type: ToastEventTypeEnum.SUCCESS
          });
          this.location.back();
        }
      });
    } else {
      this.sourcesCacheService.update(this.viewSource.id, createUpdateSource).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Form Template', message: `Form  ${this.viewSource.name} template updated`, type: ToastEventTypeEnum.SUCCESS
          });
          this.location.back();
        }
      });
    }

  }

  protected onDelete(): void {
    //todo. prompt for confirmation first
    this.sourcesCacheService.delete(this.viewSource.id).subscribe((data) => {
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
