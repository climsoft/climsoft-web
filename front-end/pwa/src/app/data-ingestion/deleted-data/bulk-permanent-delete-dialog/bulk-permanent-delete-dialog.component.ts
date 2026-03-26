import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { BulkPermanentDeleteService } from '../../services/bulk-permanent-delete.service';
import { ViewObservationQueryModel } from '../../models/view-observation-query.model';
import {
  BulkPermanentDeleteCheckResponse,
  BulkPermanentDeleteExecuteResponse,
  BulkPermanentDeleteFilter,
} from '../../models/bulk-permanent-delete.model';

type DialogStep = 'checking' | 'confirmation' | 'executing' | 'result';

@Component({
  selector: 'app-bulk-permanent-delete-dialog',
  templateUrl: './bulk-permanent-delete-dialog.component.html',
  styleUrls: ['./bulk-permanent-delete-dialog.component.scss']
})
export class BulkPermanentDeleteDialogComponent implements OnDestroy {
  @ViewChild('dlgConfirmExecute') dlgConfirmExecute!: DeleteConfirmationDialogComponent;
  @Output() done = new EventEmitter<void>();

  protected open = false;
  protected step: DialogStep = 'checking';

  // Check result
  protected checkResponse: BulkPermanentDeleteCheckResponse | null = null;

  // Execute result
  protected executeResponse: BulkPermanentDeleteExecuteResponse | null = null;

  // Filter from parent
  private parentFilter: BulkPermanentDeleteFilter = {};

  constructor(
    private bulkPermanentDeleteService: BulkPermanentDeleteService,
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
      hour: queryFilter.hour,
      useEntryDate: queryFilter.useEntryDate,
    };
    this.onCheck();
  }

  private onCheck(): void {
    this.step = 'checking';
    this.bulkPermanentDeleteService.check({ filter: this.parentFilter }).pipe(take(1)).subscribe({
      next: (response) => {
        this.checkResponse = response;
        this.step = 'confirmation';
      },
      error: (err) => {
        this.open = false;
        this.pagesDataService.showToast({
          title: 'Bulk Permanent Delete',
          message: err.error?.message || 'Failed to check for matching observations',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }

  protected onExecute(): void {
    if (!this.checkResponse) return;

    this.step = 'executing';
    this.bulkPermanentDeleteService.execute({
      sessionId: this.checkResponse.sessionId,
    }).pipe(take(1)).subscribe({
      next: (response) => {
        this.executeResponse = response;
        this.step = 'result';
      },
      error: (err) => {
        this.step = 'confirmation';
        this.pagesDataService.showToast({
          title: 'Bulk Permanent Delete',
          message: err.error?.message || 'Failed to execute bulk permanent delete',
          type: ToastEventTypeEnum.ERROR,
        });
      },
    });
  }

  protected onDownloadPreview(): void {
    if (!this.checkResponse) return;
    const url = this.bulkPermanentDeleteService.getPreviewDownloadUrl(this.checkResponse.sessionId);
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
      case 'confirmation': return 'Permanently Delete';
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
      this.bulkPermanentDeleteService.destroySession(this.checkResponse.sessionId).pipe(take(1)).subscribe();
    }
  }
}
