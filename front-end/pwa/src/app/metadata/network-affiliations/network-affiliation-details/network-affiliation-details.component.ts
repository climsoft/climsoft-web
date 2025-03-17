import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { Subject, take, takeUntil } from 'rxjs';
import { NetworkAffiliationsCacheService } from '../services/network-affiliations-cache.service';
import { ViewNetworkAffiliatioModel } from '../models/view-network-affiliation.model';
import { CreateUpdateNetworkAffiliationModel } from '../models/create-update-network-affiliation.model';
import { AppAuthService } from 'src/app/app-auth.service';

@Component({
  selector: 'app-network-affiliation-details',
  templateUrl: './network-affiliation-details.component.html',
  styleUrls: ['./network-affiliation-details.component.scss']
})
export class NetworkAffiliationDetailsComponent implements OnInit, OnDestroy {
  protected viewNetworkAffiliations!: ViewNetworkAffiliatioModel;
  protected errorMessage!: string;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private networkAffiliationCacheService: NetworkAffiliationsCacheService,
    private route: ActivatedRoute,
    private location: Location,
  ) {
    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      this.isSystemAdmin = user && user.isSystemAdmin ? true : false;
    });
  }

  ngOnInit() {
    const userId = this.route.snapshot.params['id'];
    if (StringUtils.containsNumbersOnly(userId)) {
      this.pagesDataService.setPageHeader('Edit Network Affiliation');
      this.networkAffiliationCacheService.findOne(+userId).pipe(
        takeUntil(this.destroy$)
      ).subscribe((data) => {
        if (data) this.viewNetworkAffiliations = data;
      });
    } else {
      this.pagesDataService.setPageHeader('New Network Affiliation');
      this.viewNetworkAffiliations = { id: 0, name: '', description: '', extraMetadata: null, comment: null };
    }

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSaveClick(): void {
    // TODO. do validations
    this.errorMessage = '';

    if (!this.viewNetworkAffiliations.name) {
      this.errorMessage = 'Input name';
      return;
    }

    const createUser: CreateUpdateNetworkAffiliationModel = {
      name: this.viewNetworkAffiliations.name,
      description: this.viewNetworkAffiliations.description ? this.viewNetworkAffiliations.description : null,
      extraMetadata: this.viewNetworkAffiliations.extraMetadata,
      comment: this.viewNetworkAffiliations.comment ? this.viewNetworkAffiliations.comment : null,
    }

    if (this.viewNetworkAffiliations.id > 0) {
      this.networkAffiliationCacheService.update(this.viewNetworkAffiliations.id, createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'Network Affiliation Details', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.location.back();
        }
      });

    } else {
      this.networkAffiliationCacheService.create(createUser).subscribe((data) => {
        if (data) {
          this.pagesDataService.showToast({ title: 'Network Affiliation Details', message: `${data.name} saved`, type: ToastEventTypeEnum.SUCCESS });
          this.location.back();
        }
      });
    }

  }

  protected onCancelClick(): void {
    this.location.back();
  }
}
