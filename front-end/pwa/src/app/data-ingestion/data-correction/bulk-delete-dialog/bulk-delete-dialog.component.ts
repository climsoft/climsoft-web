import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { BulkDeleteService } from '../../services/bulk-delete.service';
import { ViewObservationQueryModel } from '../../models/view-observation-query.model';
import {
  BulkDeleteCheckResponse,
  BulkDeleteExecuteResponse,
} from '../../models/bulk-delete.model';
import { BulkObservationFilter } from '../../models/bulk-observation-filter.model';

type DialogStep = 'checking' | 'confirmation' | 'executing' | 'result';

@Component({
  selector: 'app-bulk-delete-dialog',
  templateUrl: './bulk-delete-dialog.component.html',
  styleUrls: ['./bulk-delete-dialog.component.scss']
})
export class BulkDeleteDialogComponent implements OnDestroy {
  @ViewChild('dlgConfirmExecute') dlgConfirmExecute!: ConfirmationDialogComponent;
  @Output() done = new EventEmitter<void>();

  protected open = false;
  protected step: DialogStep = 'checking';

  // Check result
  protected checkResponse: BulkDeleteCheckResponse | null = null;

  // Execute result
  protected executeResponse: BulkDeleteExecuteResponse | null = null;

  // Filter from parent
  private parentFilter: BulkObservationFilter = {};

  constructor(
    private bulkDeleteService: BulkDeleteService,
    private pagesDataService: PagesDataService,
  ) { }

  ngOnDestroy(): void {
    this.cleanupSession();
  }

  public openDialog(queryFilter: ViewObservationQueryModel): void {
    this.open = true;
    this.checkResponse = null;
    this.executeResponse = null;
    this.parentFilter = {
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
    this.onCheck();
  }

  private onCheck(): void {
    this.step = 'checking';
    this.bulkDeleteService.check({ filter: this.parentFilter }).pipe(take(1)).subscribe({
      next: (response) => {
        this.checkResponse = response;
        this.step = 'confirmation';
      },
      error: (err) => {
        this.open = false;
        this.pagesDataService.showToast({
          title: 'Bulk Delete',
          message: err.error?.message || 'Failed to check for matching observations',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }

  protected onExecute(): void {
    if (!this.checkResponse) return;

    this.step = 'executing';
    this.bulkDeleteService.execute({
      sessionId: this.checkResponse.sessionId,
    }).pipe(take(1)).subscribe({
      next: (response) => {
        this.executeResponse = response;
        this.step = 'result';
      },
      error: (err) => {
        this.step = 'confirmation';
        this.pagesDataService.showToast({
          title: 'Bulk Delete',
          message: err.error?.message || 'Failed to execute bulk delete',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }

  protected onDownloadPreview(): void {
    if (!this.checkResponse) return;
    const url = this.bulkDeleteService.getPreviewDownloadUrl(this.checkResponse.sessionId);
    window.open(url, '_blank');
  }

  // Dialog button configuration per step
  protected get displayOkOption(): boolean {
    return this.step === 'confirmation' || this.step === 'result';
  }

  protected get disableOkOption(): boolean {
    if (this.step === 'confirmation') {
      return !this.checkResponse || this.checkResponse.totalMatchingRows === 0;
    }
    return false;
  }

  protected get okButtonLabel(): string {
    switch (this.step) {
      case 'confirmation': return 'Delete Observations';
      case 'result': return 'Close';
      default: return 'Ok';
    }
  }

  protected get displayCancelOption(): boolean {
    return this.step === 'confirmation';
  }

  protected get cancelButtonLabel(): string {
    return 'Cancel';
  }

  protected onOkClick(): void {
    switch (this.step) {
      case 'confirmation': this.dlgConfirmExecute.openDialog(); break;
      case 'result': this.closeDialog(); break;
    }
  }

  protected onCancelClick(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.cleanupSession();
    this.open = false;
    if (this.executeResponse && this.executeResponse.deletedCount > 0) {
      this.done.emit();
    }
  }

  private cleanupSession(): void {
    if (this.checkResponse?.sessionId) {
      this.bulkDeleteService.destroySession(this.checkResponse.sessionId).pipe(take(1)).subscribe();
    }
  }
}
