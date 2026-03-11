import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, takeUntil } from 'rxjs';
import { FlagsCacheService } from '../services/flags-cache.service';
import { ViewFlagModel } from '../models/view-flag.model';
import { CreateUpdateFlagModel } from '../models/create-update-flag.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-flag-input-dialog',
  templateUrl: './flag-input-dialog.component.html',
  styleUrls: ['./flag-input-dialog.component.scss']
})
export class FlagInputDialogComponent implements OnDestroy {
  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
  protected viewFlag!: ViewFlagModel;
  protected errorMessage!: string;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private flagsCacheService: FlagsCacheService,
  ) {
  }

  public openDialog(flagId?: number): void {
    this.errorMessage = '';
    this.open = true;

    if (flagId) {
      this.title = 'Edit Flag';
      this.flagsCacheService.findOne(flagId).pipe(
        takeUntil(this.destroy$)
      ).subscribe((data) => {
        if (!data) throw new Error('flag not found');
        this.viewFlag = { ...data };
      });
    } else {
      this.title = 'New Flag';
      this.viewFlag = { id: 0, abbreviation: '', name: '', description: '', comment: '' };
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSaveClick(): void {
    this.errorMessage = '';

    if (!this.viewFlag.abbreviation) {
      this.errorMessage = 'Input abbreviation';
      return;
    }

    if (!this.viewFlag.name) {
      this.errorMessage = 'Input name';
      return;
    }

    const createUpdateDto: CreateUpdateFlagModel = {
      abbreviation: this.viewFlag.abbreviation,
      name: this.viewFlag.name,
      description: this.viewFlag.description || null,
      comment: this.viewFlag.comment || null,
    };

    if (this.viewFlag.id > 0) {
      this.flagsCacheService.update(this.viewFlag.id, createUpdateDto).subscribe({
        next: (data) => {
          this.pagesDataService.showToast({ title: 'Flag Details', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.open = false;
          this.ok.emit();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to save changes';
        }
      });
    } else {
      this.flagsCacheService.add(createUpdateDto).subscribe({
        next: (data) => {
          this.pagesDataService.showToast({ title: 'Flag Details', message: `${data.name} saved`, type: ToastEventTypeEnum.SUCCESS });
          this.open = false;
          this.ok.emit();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to save changes';
        }
      });
    }
  }

  protected onDeleteClick(): void {
    this.flagsCacheService.delete(this.viewFlag.id).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Flag Details', message: `${this.viewFlag.name} deleted`, type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.ok.emit();
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to save changes';
      }
    });
  }

}
