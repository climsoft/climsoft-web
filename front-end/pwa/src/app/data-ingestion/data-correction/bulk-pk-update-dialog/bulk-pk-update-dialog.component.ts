import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { BulkPkUpdateService } from '../../services/bulk-pk-update.service';
import { ViewObservationQueryModel } from '../../models/view-observation-query.model';
import {
  BulkPkUpdateCheckResponse,
  BulkPkUpdateExecuteResponse,
  BulkPkUpdateFilter,
  ConflictResolutionEnum,
  DateTimeShiftUnitEnum,
  PkChangeSpec,
  PkFieldEnum,
} from '../../models/bulk-pk-update.model';

type DialogStep = 'configure' | 'checking' | 'conflicts' | 'executing' | 'result';

@Component({
  selector: 'app-bulk-pk-update-dialog',
  templateUrl: './bulk-pk-update-dialog.component.html',
  styleUrls: ['./bulk-pk-update-dialog.component.scss']
})
export class BulkPkUpdateDialogComponent implements OnDestroy {
  @ViewChild('dlgConfirmExecute') dlgConfirmExecute!: DeleteConfirmationDialogComponent;
  @Output() done = new EventEmitter<void>();

  protected open = false;
  protected step: DialogStep = 'configure';

  // Configuration
  protected selectedPkField: { value: PkFieldEnum; label: string } | null = null;
  protected fromStationId: string | null = null;
  protected toStationId: string | null = null;
  protected fromElementId: number | null = null;
  protected toElementId: number | null = null;
  protected fromLevel: number | null = 0;
  protected toLevel: number | null = 0;
  protected fromIntervalId: number | null = null;
  protected toIntervalId: number | null = null;
  protected fromSourceId: number | null = null;
  protected toSourceId: number | null = null;
  protected shiftAmount: number = 1;
  protected selectedShiftUnit: { value: DateTimeShiftUnitEnum; label: string } | null = null;

  // Check result
  protected checkResponse: BulkPkUpdateCheckResponse | null = null;
  protected selectedConflictResolution: { value: ConflictResolutionEnum; label: string } | null = null;

  // Execute result
  protected executeResponse: BulkPkUpdateExecuteResponse | null = null;

  // Filter from parent
  private filter: BulkPkUpdateFilter = {};

  // Enums for template
  protected PkFieldEnum = PkFieldEnum;

  protected pkFields = [
    { value: PkFieldEnum.STATION_ID, label: 'Station ID' },
    { value: PkFieldEnum.ELEMENT_ID, label: 'Element ID' },
    { value: PkFieldEnum.LEVEL, label: 'Level' },
    { value: PkFieldEnum.DATE_TIME, label: 'Date/Time (shift)' },
    { value: PkFieldEnum.INTERVAL, label: 'Interval' },
    { value: PkFieldEnum.SOURCE_ID, label: 'Source ID' },
  ];

  protected shiftUnits = [
    { value: DateTimeShiftUnitEnum.YEARS, label: 'Years' },
    { value: DateTimeShiftUnitEnum.MONTHS, label: 'Months' },
    { value: DateTimeShiftUnitEnum.DAYS, label: 'Days' },
    { value: DateTimeShiftUnitEnum.HOURS, label: 'Hours' },
  ];

  protected conflictResolutions = [
    { value: ConflictResolutionEnum.SKIP, label: 'Skip conflicting rows' },
    { value: ConflictResolutionEnum.OVERWRITE, label: 'Overwrite conflicting rows' },
  ];

  protected optionLabelFn = (option: { label: string }) => option.label;

  constructor(
    private bulkPkUpdateService: BulkPkUpdateService,
    private pagesDataService: PagesDataService,
  ) { }

  ngOnDestroy(): void {
    this.cleanupSession();
  }

  public openDialog(queryFilter: ViewObservationQueryModel): void {
    this.open = true;
    this.step = 'configure';
    this.resetForm();
    this.filter = {
      stationIds: queryFilter.stationIds,
      elementIds: queryFilter.elementIds,
      level: queryFilter.level,
      intervals: queryFilter.intervals,
      sourceIds: queryFilter.sourceIds,
      fromDate: queryFilter.fromDate,
      toDate: queryFilter.toDate,
      hours: queryFilter.hours,
      useEntryDate: queryFilter.useEntryDate,
    };
  }

  protected get isConfigValid(): boolean {
    if (!this.selectedPkField) return false;
    const field = this.selectedPkField.value;
    if (field === PkFieldEnum.DATE_TIME) {
      return this.shiftAmount !== 0 && this.selectedShiftUnit !== null;
    }
    switch (field) {
      case PkFieldEnum.STATION_ID:
        return this.fromStationId !== null && this.toStationId !== null && this.fromStationId !== this.toStationId;
      case PkFieldEnum.ELEMENT_ID:
        return this.fromElementId !== null && this.toElementId !== null && this.fromElementId !== this.toElementId;
      case PkFieldEnum.LEVEL:
        return this.fromLevel !== null && this.toLevel !== null && this.fromLevel !== this.toLevel;
      case PkFieldEnum.INTERVAL:
        return this.fromIntervalId !== null && this.toIntervalId !== null && this.fromIntervalId !== this.toIntervalId;
      case PkFieldEnum.SOURCE_ID:
        return this.fromSourceId !== null && this.toSourceId !== null && this.fromSourceId !== this.toSourceId;
      default:
        return false;
    }
  }

  protected onCheck(): void {
    if (!this.selectedPkField) return;

    const field = this.selectedPkField.value;
    const change: PkChangeSpec = { field };

    if (field === PkFieldEnum.DATE_TIME) {
      change.shiftAmount = this.shiftAmount;
      change.shiftUnit = this.selectedShiftUnit!.value;
    } else {
      switch (field) {
        case PkFieldEnum.STATION_ID:
          change.fromValue = this.fromStationId!;
          change.toValue = this.toStationId!;
          break;
        case PkFieldEnum.ELEMENT_ID:
          change.fromValue = this.fromElementId!;
          change.toValue = this.toElementId!;
          break;
        case PkFieldEnum.LEVEL:
          change.fromValue = this.fromLevel!;
          change.toValue = this.toLevel!;
          break;
        case PkFieldEnum.INTERVAL:
          change.fromValue = this.fromIntervalId!;
          change.toValue = this.toIntervalId!;
          break;
        case PkFieldEnum.SOURCE_ID:
          change.fromValue = this.fromSourceId!;
          change.toValue = this.toSourceId!;
          break;
      }
    }

    this.step = 'checking';
    this.bulkPkUpdateService.check({ filter: this.filter, change }).pipe(take(1)).subscribe({
      next: (response) => {
        this.checkResponse = response;
        this.selectedConflictResolution = this.conflictResolutions[0]; // default to Skip
        this.step = 'conflicts';
      },
      error: (err) => {
        this.step = 'configure';
        this.pagesDataService.showToast({
          title: 'Bulk PK Update',
          message: err.error?.message || 'Failed to check for conflicts',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }

  protected onExecute(): void {
    if (!this.checkResponse) return;

    this.step = 'executing';
    this.bulkPkUpdateService.execute({
      sessionId: this.checkResponse.sessionId,
      conflictResolution: this.selectedConflictResolution!.value,
    }).pipe(take(1)).subscribe({
      next: (response) => {
        this.executeResponse = response;
        this.step = 'result';
      },
      error: (err) => {
        this.step = 'conflicts';
        this.pagesDataService.showToast({
          title: 'Bulk PK Update',
          message: err.error?.message || 'Failed to execute bulk update',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }

  protected onDownloadConflicts(): void {
    if (!this.checkResponse) return;
    const url = this.bulkPkUpdateService.getConflictDownloadUrl(this.checkResponse.sessionId);
    window.open(url, '_blank');
  }

  // Dialog button configuration per step
  protected get displayOkOption(): boolean {
    return this.step === 'configure' || this.step === 'conflicts' || this.step === 'result';
  }

  protected get disableOkOption(): boolean {
    return this.step === 'configure' && !this.isConfigValid;
  }

  protected get okButtonLabel(): string {
    switch (this.step) {
      case 'configure': return 'Check for Conflicts';
      case 'conflicts': return this.checkResponse?.conflictCount === 0 ? 'Execute Update' : 'Execute';
      case 'result': return 'Close';
      default: return 'Ok';
    }
  }

  protected get displayCancelOption(): boolean {
    return this.step === 'configure' || this.step === 'conflicts';
  }

  protected get cancelButtonLabel(): string {
    return this.step === 'conflicts' ? 'Back' : 'Cancel';
  }

  protected onOkClick(): void {
    switch (this.step) {
      case 'configure': this.onCheck(); break;
      case 'conflicts': this.dlgConfirmExecute.openDialog(); break;
      case 'result': this.closeDialog(); break;
    }
  }

  protected onCancelClick(): void {
    if (this.step === 'conflicts') {
      this.onBack();
    } else {
      this.closeDialog();
    }
  }

  private closeDialog(): void {
    this.open = false;
    if (this.executeResponse && this.executeResponse.updatedCount > 0) {
      this.done.emit();
    }
  }

  private onBack(): void {
    this.cleanupSession();
    this.checkResponse = null;
    this.executeResponse = null;
    this.step = 'configure';
  }

  private resetForm(): void {
    this.selectedPkField = null;
    this.fromStationId = null;
    this.toStationId = null;
    this.fromElementId = null;
    this.toElementId = null;
    this.fromLevel = null;
    this.toLevel = null;
    this.fromIntervalId = null;
    this.toIntervalId = null;
    this.fromSourceId = null;
    this.toSourceId = null;
    this.shiftAmount = 1;
    this.selectedShiftUnit = null;
    this.checkResponse = null;
    this.executeResponse = null;
    this.selectedConflictResolution = null;
  }

  private cleanupSession(): void {
    if (this.checkResponse?.sessionId) {
      this.bulkPkUpdateService.destroySession(this.checkResponse.sessionId).pipe(take(1)).subscribe();
    }
  }
}
