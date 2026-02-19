import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { Subject, take, takeUntil } from 'rxjs';
import { NetworkAffiliationsCacheService } from '../services/network-affiliations-cache.service';
import { ViewNetworkAffiliationModel } from '../models/view-network-affiliation.model';
import { CreateUpdateNetworkAffiliationModel } from '../models/create-update-network-affiliation.model';

@Component({
  selector: 'app-network-affiliation-input-dialog',
  templateUrl: './network-affiliation-input-dialog.component.html',
  styleUrls: ['./network-affiliation-input-dialog.component.scss']
})
export class NetworkAffiliationInputDialogComponent implements OnDestroy {
  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = '';
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
      this.viewNetworkAffiliations = { id: 0, name: '', description: '', parentNetworkId: 0, extraMetadata: null, comment: null };
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
      parentNetworkId: this.viewNetworkAffiliations.parentNetworkId ? this.viewNetworkAffiliations.parentNetworkId : null,
      extraMetadata: this.viewNetworkAffiliations.extraMetadata,
      comment: this.viewNetworkAffiliations.comment ? this.viewNetworkAffiliations.comment : null,
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

}
