import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { ViewFlagModel } from '../models/view-flag.model';
import { FlagsCacheService } from '../services/flags-cache.service';
import { FlagInputDialogComponent } from '../flag-input-dialog/flag-input-dialog.component';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

type optionsType = 'Add' | 'Delete All';

@Component({
  selector: 'app-view-flags',
  templateUrl: './view-flags.component.html',
  styleUrls: ['./view-flags.component.scss']
})
export class ViewFlagsComponent implements OnDestroy {
  @ViewChild('dlgFlagDetails') dlgFlagDetails!: FlagInputDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;
  protected flags: ViewFlagModel[] = [];
  protected isSystemAdmin: boolean = false;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private flagsCacheService: FlagsCacheService,
  ) {

    this.pagesDataService.setPageHeader('Flags');

    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
    });

    this.flagsCacheService.cachedFlags.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.flags = data;
      this.applySort();
      this.updatePaging();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onOptionsClicked(option: optionsType): void {
    if (option === 'Add') {
      this.dlgFlagDetails.openDialog();
    } else if (option === 'Delete All') {
      this.dlgDeleteAllConfirm.openDialog();
    }
  }

  protected onDeleteAllConfirm(): void {
    this.flagsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
      this.pagesDataService.showToast({ title: "Flags Deleted", message: `All flags deleted`, type: ToastEventTypeEnum.SUCCESS });
    });
  }

  protected onEditFlag(flag: ViewFlagModel): void {
    if (!this.isSystemAdmin) return;
    this.dlgFlagDetails.openDialog(flag.id);
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): ViewFlagModel[] {
    return this.flags.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
  }

  protected onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
    this.pageInputDefinition.onFirst();
  }

  private applySort(): void {
    if (!this.sortColumn) return;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.flags.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.flags.length);
  }

}
