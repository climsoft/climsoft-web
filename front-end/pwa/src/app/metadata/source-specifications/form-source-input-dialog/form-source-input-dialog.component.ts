import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { FormElementMetadata, FormSourceModel, LayoutType, SelectorFieldControlType, } from '../models/form-source.model';
import { CreateSourceSpecificationModel } from '../models/create-source-specification.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { SourceTypeEnum } from 'src/app/metadata/source-specifications/models/source-type.enum';
import { take } from 'rxjs';
import { ViewSourceSpecificationModel } from 'src/app/metadata/source-specifications/models/view-source-specification.model';
import { SourcesCacheService } from '../services/source-cache.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

// TODO. Try using angular forms?

@Component({
  selector: 'app-form-source-input-dialog',
  templateUrl: './form-source-input-dialog.component.html',
  styleUrls: ['./form-source-input-dialog.component.scss']
})
export class FormSourceInputDialogComponent {
  @ViewChild('dlgSaveConfirm') dlgSaveConfirm!: ConfirmationDialogComponent;
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: ConfirmationDialogComponent;

  @Output() public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected viewSource!: ViewSourceSpecificationModel;

  protected possibleSelectors: SelectorFieldControlType[] = [SelectorFieldControlType.ELEMENT, SelectorFieldControlType.DAY, SelectorFieldControlType.HOUR];
  protected possibleFields: SelectorFieldControlType[] = [SelectorFieldControlType.ELEMENT, SelectorFieldControlType.DAY, SelectorFieldControlType.HOUR];

  protected selectedSelectors: SelectorFieldControlType[] = [];
  protected selectedFields: SelectorFieldControlType[] = [];
  protected selectedLayout: LayoutType = LayoutType.LINEAR;
  /** Per-element config: element id and its allowed hours (`null` = inherit form hours). */
  protected elementsMetadata: FormElementMetadata[] = [];
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
  protected intervalErrorMessage: string = '';

  constructor(
    private pagesDataService: PagesDataService,
    private sourcesCacheService: SourcesCacheService,
    private cachedMetadataService: CachedMetadataService) {
  }

  public openDialog(source?: ViewSourceSpecificationModel): void {
    this.open = true;

    if (source) {
      this.title = 'Edit Form Specification';
      this.viewSource = structuredClone(source);
      this.setControlValues(this.viewSource.parameters as FormSourceModel);
    } else {
      this.title = 'New Form Specification';
      const entryForm: FormSourceModel = {
        selectors: [SelectorFieldControlType.DAY, SelectorFieldControlType.HOUR],
        fields: [SelectorFieldControlType.ELEMENT],
        layout: LayoutType.LINEAR,
        elementsMetadata: [],
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
        sampleFileName: '',
        adapterId: 0,
        parameters: entryForm,
        disabled: false,
        comment: '',
      };
      this.setControlValues(this.viewSource.parameters as FormSourceModel);
    }
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
    // Clone each element row so dialog edits don't mutate the source's stored parameters until save.
    this.elementsMetadata = entryForm.elementsMetadata.map(m => ({ elementId: m.elementId, hours: m.hours === null ? null : [...m.hours] }));
    this.selectedHourIds = [...entryForm.hours];
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
    this.pruneElementHoursToFormHours();
    this.intervalErrorMessage = this.selectedIntervalId === null ? 'Select interval' : '';
  }

  protected onHoursSelected(hourIds: number[]) {
    this.selectedHourIds = hourIds;
    this.pruneElementHoursToFormHours();
  }

  /** Drop any per-element hour that's no longer present in `selectedHourIds`; snap back to inherit when emptied. */
  private pruneElementHoursToFormHours(): void {
    const allowed: Set<number> = new Set(this.selectedHourIds);
    for (const meta of this.elementsMetadata) {
      if (meta.hours === null) continue;
      const pruned = meta.hours.filter(h => allowed.has(h));
      meta.hours = pruned.length === 0 ? null : pruned;
    }
  }

  // ─── Per-element configuration ───

  /** Ids displayed by the element multi-selector; derived from elementsMetadata to preserve row order. */
  protected get selectedElementIds(): number[] {
    return this.elementsMetadata.map(m => m.elementId);
  }

  protected onElementsSelected(newIds: number[]): void {
    const existing = new Map<number, FormElementMetadata>(this.elementsMetadata.map(m => [m.elementId, m]));
    // Preserve existing per-element config for ids that remain; new ids default to "inherit form hours".
    this.elementsMetadata = newIds.map(id => existing.get(id) ?? { elementId: id, hours: null });
  }

  protected getElementLabel(elementId: number): string {
    const el = this.cachedMetadataService.getElement(elementId);
    return el ? `${el.id} - ${el.abbreviation} - ${el.name}` : `#${elementId}`;
  }

  protected isInheritingFormHours(meta: FormElementMetadata): boolean {
    return meta.hours === null;
  }

  protected onAllHoursToggle(index: number, inheritAll: boolean): void {
    // Toggling on snaps back to "inherit". Toggling off seeds with the current form hours so admin can trim.
    this.elementsMetadata[index].hours = inheritAll ? null : [...this.selectedHourIds];
  }

  protected onElementHoursChange(index: number, newHours: number[]): void {
    // Empty restriction is meaningless — fall back to inheriting form hours.
    this.elementsMetadata[index].hours = newHours.length === 0 ? null : newHours;
  }

  // ─── Save / Delete ───

  protected onSave(): void {

    if (!this.viewSource.name) {
      this.pagesDataService.showToast({ title: 'Form specification', message: 'Enter name', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.viewSource.description) {
      this.pagesDataService.showToast({ title: 'Form specification', message: 'Enter description', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.validSelectors(this.selectedSelectors)) {
      this.pagesDataService.showToast({ title: 'Form specification', message: 'Select valid selectors', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.validFields(this.selectedSelectors, this.selectedFields)) {
      this.pagesDataService.showToast({ title: 'Form specification', message: 'Select valid fields', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.selectedLayout) {
      this.pagesDataService.showToast({ title: 'Form specification', message: 'Select valid layout', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.elementsMetadata.length === 0) {
      this.pagesDataService.showToast({ title: 'Form specification', message: 'Select elements', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.selectedIntervalId) {
      this.pagesDataService.showToast({ title: 'Form specification', message: 'Select interval', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.selectedHourIds.length === 0) {
      this.pagesDataService.showToast({ title: 'Form specification', message: 'Select hours', type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.dlgSaveConfirm.openDialog();
  }

  protected onSaveConfirm(): void {
    const entryForm: FormSourceModel = {
      selectors: this.selectedSelectors.length === 1 ? [this.selectedSelectors[0]] : [this.selectedSelectors[0], this.selectedSelectors[1]],
      fields: this.selectedFields.length === 1 ? [this.selectedFields[0]] : [this.selectedFields[0], this.selectedFields[1]],
      layout: this.selectedLayout,
      elementsMetadata: this.elementsMetadata,
      hours: this.selectedHourIds,
      interval: this.selectedIntervalId!,
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
      adapterId: null,
      sampleFileOperationId: null,
      parameters: entryForm,
      scaleValues: true, // By default form values are always scaled.
      disabled: this.viewSource.disabled,
      comment: this.viewSource.comment || null,
    }

    if (this.viewSource.id === 0) {
      this.sourcesCacheService.add(createUpdateSource).pipe(
        take(1)
      ).subscribe({
        next: (data) => {
          if (data) {
            this.pagesDataService.showToast({ title: 'Form Specification', message: `Form ${this.viewSource.name} created`, type: ToastEventTypeEnum.SUCCESS });
            this.open = false;
            this.ok.emit();
          }
        },
        error: (err) => {
          console.error(err)
          this.pagesDataService.showToast({ title: 'Form Specification', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
        }
      });
    } else {
      this.sourcesCacheService.update(this.viewSource.id, createUpdateSource).pipe(
        take(1)
      ).subscribe({
        next: (data) => {
          if (data) {
            this.pagesDataService.showToast({ title: 'Form Specification', message: `Form  ${this.viewSource.name} updated`, type: ToastEventTypeEnum.SUCCESS });
            this.open = false;
            this.ok.emit();
          }
        }, error: (err) => {
          console.error(err)
          this.pagesDataService.showToast({ title: 'Form Specification', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
        }
      });
    }
  }

  protected onDelete(): void {
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    this.sourcesCacheService.delete(this.viewSource.id).pipe(
      take(1)
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Form Specification', message: 'Form specification deleted', type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.ok.emit();
      }, error: (err) => {
        console.error(err)
        this.pagesDataService.showToast({ title: 'Form Specification', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      }
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
