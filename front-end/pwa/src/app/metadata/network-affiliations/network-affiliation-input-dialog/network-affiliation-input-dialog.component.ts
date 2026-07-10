import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { NetworkAffiliationsCacheService } from '../services/network-affiliations-cache.service';
import { ViewNetworkAffiliationModel } from '../models/view-network-affiliation.model';
import { CreateUpdateNetworkAffiliationModel } from '../models/create-update-network-affiliation.model';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-network-affiliation-input-dialog',
  templateUrl: './network-affiliation-input-dialog.component.html',
  styleUrls: ['./network-affiliation-input-dialog.component.scss']
})
export class NetworkAffiliationInputDialogComponent implements OnDestroy {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: ConfirmationDialogComponent;
  @Output() public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: 'Edit Network Affiliation' | 'New Network Affiliation' = 'New Network Affiliation';
  protected viewNetworkAffiliations!: ViewNetworkAffiliationModel;
  protected errorMessage!: string;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private networkAffiliationCacheService: NetworkAffiliationsCacheService,
  ) {
  }

  public openDialog(networkAffiliationId?: number): void {
    this.errorMessage = '';
    this.open = true;

    if (networkAffiliationId) {
      this.title = 'Edit Network Affiliation';
      this.networkAffiliationCacheService.findOne(networkAffiliationId).pipe(
        takeUntil(this.destroy$)
      ).subscribe((data) => {
        if (data) this.viewNetworkAffiliations = data;
      });
    } else {
      this.title = 'New Network Affiliation';
      this.viewNetworkAffiliations = { id: 0, name: '', description: '' };
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSaveClick(): void {
    this.errorMessage = '';

    if (!this.viewNetworkAffiliations.name) {
      this.errorMessage = 'Enter name';
      return;
    }

    if (!this.viewNetworkAffiliations.description) {
      this.errorMessage = 'Enter description';
      return;
    }

    const createUser: CreateUpdateNetworkAffiliationModel = {
      name: this.viewNetworkAffiliations.name,
      description: this.viewNetworkAffiliations.description,
      extraMetadata: this.viewNetworkAffiliations.extraMetadata,
      comment: this.viewNetworkAffiliations.comment || undefined,
    }

    if (this.viewNetworkAffiliations.id > 0) {
      this.networkAffiliationCacheService.update(this.viewNetworkAffiliations.id, createUser).pipe(take(1)).subscribe(data => {
        this.pagesDataService.showToast({ title: 'Network Affiliation Details', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.ok.emit();
      });

    } else {
      this.networkAffiliationCacheService.create(createUser).pipe(take(1)).subscribe(data => {
        this.pagesDataService.showToast({ title: 'Network Affiliation Details', message: `${data.name} saved`, type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.ok.emit();
      });
    }
  }

  protected onDelete(): void {
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    this.networkAffiliationCacheService.delete(this.viewNetworkAffiliations.id).pipe(
      take(1),
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Network Affiliation Details', message: 'Network Affiliation deleted', type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.ok.emit();
      },
      error: (err) => {
        console.error(err);
        this.pagesDataService.showToast({ title: 'Network Affiliation Details', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });
  }

}
