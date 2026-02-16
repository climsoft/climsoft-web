import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormSourceModel, LayoutType, SelectorFieldControlType, } from '../models/form-source.model';
import { CreateSourceSpecificationModel } from '../models/create-source-specification.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { SourcesCacheService } from '../services/source-cache.service';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

// TODO. Try using angular forms?

@Component({
  selector: 'app-form-source-detail',
  templateUrl: './form-source-detail.component.html',
  styleUrls: ['./form-source-detail.component.scss']
})
export class FormSourceDetailComponent implements OnDestroy {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;

  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected viewSource!: ViewSourceModel;

  protected possibleSelectors: SelectorFieldControlType[] = [SelectorFieldControlType.ELEMENT, SelectorFieldControlType.DAY, SelectorFieldControlType.HOUR];
  protected possibleFields: SelectorFieldControlType[] = [SelectorFieldControlType.ELEMENT, SelectorFieldControlType.DAY, SelectorFieldControlType.HOUR];

  protected selectedSelectors: SelectorFieldControlType[] = [];
  protected selectedFields: SelectorFieldControlType[] = [];
  protected selectedLayout: LayoutType = LayoutType.LINEAR;
  protected selectedElementIds: number[] = [];
  protected possibleHourIds: number[] = [];
  protected selectedHourIds: number[] = [];
  protected selectedIntervalId: number | null = null;
  protected utcOffset: number = 0;
  protected allowMissingValue: boolean = true;
  protected requireTotalInput: boolean = false;
  protected allowStationSelection: boolean = false;
  protected allowEntryAtStationOnly: boolean = false;
  protected allowDoubleDataEntry: boolean = false;
  protected selectorsErrorMessage: string = '';
  protected fieldsErrorMessage: string = '';
  protected elementsErrorMessage: string = '';
  protected hoursErrorMessage: string = '';
  protected intervalErrorMessage: string = '';
  protected errorMessage: string = '';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private sourcesCacheService: SourcesCacheService) {
  }

  public openDialog(sourceId?: number): void {
    this.open = true;

    if (sourceId) {
      this.title = 'Edit Form Specification';
      this.sourcesCacheService.findOne(sourceId).pipe(
        takeUntil(this.destroy$),
      ).subscribe(data => {
        if (data) {
          this.viewSource = data;
          this.setControlValues(this.viewSource.parameters as FormSourceModel);
        }
      });
    } else {
      this.title = 'New Form Specification';
      const entryForm: FormSourceModel = {
        selectors: [SelectorFieldControlType.DAY, SelectorFieldControlType.HOUR],
        fields: [SelectorFieldControlType.ELEMENT],
        layout: LayoutType.LINEAR,
        elementIds: [],
        hours: [],
        interval: 1440,
        requireTotalInput: false,
        allowEntryAtStationOnly: false,
        allowStationSelection: false,
        allowDoubleDataEntry: false,
      }
      this.viewSource = {
        id: 0,
        name: '',
        description: '',
        sourceType: SourceTypeEnum.FORM,
        utcOffset: 0,
        allowMissingValue: true,
        scaleValues: true, // By default forms usually have scaled values.
        sampleFile: '',
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

  private setControlValues(entryForm: FormSourceModel): void {
    const selectedSelectors: SelectorFieldControlType[] = [];
    const possibleFields: SelectorFieldControlType[] = [];
    const selectedFields: SelectorFieldControlType[] = [];

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
    this.requireTotalInput = entryForm.requireTotalInput ? true : false;
    this.allowEntryAtStationOnly = entryForm.allowEntryAtStationOnly ? true : false;
    this.allowStationSelection = entryForm.allowStationSelection ? true : false;
    this.allowDoubleDataEntry = entryForm.allowDoubleDataEntry ? true : false;
  }

  public onSelectorsSelected(selectedSelectors: SelectorFieldControlType[]): void {

    if (!this.validSelectors(selectedSelectors)) {
      return;
    }

    this.selectedSelectors = selectedSelectors;

    //remove selected selector from the list of selectable entry fields
    this.possibleFields = this.possibleSelectors.filter(data => !selectedSelectors.includes(data));
    this.selectedFields = [];
    this.selectedLayout = this.getLayout(this.selectedFields);
  }

  public onFieldsSelected(selectedFields: SelectorFieldControlType[]): void {

    if (!this.validFields(this.selectedSelectors, selectedFields)) {
      return;
    }

    this.selectedFields = selectedFields;
    this.selectedLayout = this.getLayout(this.selectedFields);
  }

  private getLayout(fields: SelectorFieldControlType[]): LayoutType {
    return fields.length === 2 ? LayoutType.GRID : LayoutType.LINEAR;
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

    const entryForm: FormSourceModel = {
      selectors: this.selectedSelectors.length === 1 ? [this.selectedSelectors[0]] : [this.selectedSelectors[0], this.selectedSelectors[1]],
      fields: this.selectedFields.length === 1 ? [this.selectedFields[0]] : [this.selectedFields[0], this.selectedFields[1]],
      layout: this.selectedLayout,
      elementIds: this.selectedElementIds,
      hours: this.selectedHourIds,
      interval: this.selectedIntervalId,
      requireTotalInput: this.requireTotalInput,
      allowEntryAtStationOnly: this.allowEntryAtStationOnly,
      allowStationSelection: this.allowStationSelection,
      allowDoubleDataEntry: this.allowDoubleDataEntry,
    };

    const createUpdateSource: CreateSourceSpecificationModel = {
      name: this.viewSource.name,
      description: this.viewSource.description,
      sourceType: SourceTypeEnum.FORM,
      utcOffset: this.utcOffset,
      allowMissingValue: this.allowMissingValue,
      sampleFile: '',
      parameters: entryForm,
      scaleValues: true, // By default form values are always scaled.
      disabled: this.viewSource.disabled,
      comment: this.viewSource.comment,
    }

    if (this.viewSource.id === 0) {
      this.sourcesCacheService.add(createUpdateSource).pipe(
        take(1)
      ).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({
            title: 'Form Template', message: `Form ${this.viewSource.name} template saved`, type: ToastEventTypeEnum.SUCCESS
          });
          this.open = false;
          this.ok.emit();
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
          this.open = false;
          this.ok.emit();
        }
      });
    }

  }

  protected onDelete(): void {
    this.dlgDeleteConfirm.showDialog();
  }

  protected onDeleteConfirm(): void {
    this.sourcesCacheService.delete(this.viewSource.id).pipe(
      take(1)
    ).subscribe(() => {
      this.pagesDataService.showToast({ title: 'Form Specification', message: 'Form specification deleted', type: ToastEventTypeEnum.SUCCESS });
      this.open = false;
      this.ok.emit();
    });
  }

  private validSelectors(selectors: SelectorFieldControlType[]): boolean {
    this.selectorsErrorMessage = '';
    if (selectors.length === 0) {
      this.selectorsErrorMessage = 'Selector(s) required';
    } else if (selectors.length > 2) {
      this.selectorsErrorMessage = 'Maximum selectors allowed are 2';
    }

    return this.selectorsErrorMessage === '';
  }

  private validFields(selectors: SelectorFieldControlType[], fields: SelectorFieldControlType[]): boolean {
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
