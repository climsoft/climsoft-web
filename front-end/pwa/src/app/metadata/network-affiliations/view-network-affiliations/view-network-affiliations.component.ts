import { Component, OnDestroy } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { AppAuthService } from 'src/app/app-auth.service'; 
import { ActivatedRoute, Router } from '@angular/router';
import { ViewNetworkAffiliatioModel } from '../models/view-network-affiliation.model';
import { NetworkAffiliationsCacheService } from '../services/network-affiliations-cache.service';

type optionsType = 'Add' | 'Delete All';

@Component({
  selector: 'app-view-network-affiliations',
  templateUrl: './view-network-affiliations.component.html',
  styleUrls: ['./view-network-affiliations.component.scss']
})
export class ViewNetworkAffiliationsComponent implements OnDestroy {
  protected networkAffiliations!: ViewNetworkAffiliatioModel[];
  protected dropDownItems: optionsType[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private networkAffiliationsCacheService: NetworkAffiliationsCacheService,
    private router: Router,
    private route: ActivatedRoute,
  ) {

    this.pagesDataService.setPageHeader('Network Affiliations');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      this.dropDownItems = user && user.isSystemAdmin ? ['Add', 'Delete All'] : [];
    });

    // Get all sources 
    this.networkAffiliationsCacheService.cachedNetworkAffiliations.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.networkAffiliations = data;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearch(): void {
    // TODO.
  }

  protected onOptionsClicked(option: optionsType): void {
    if (option === 'Add') {
      this.router.navigate(['network-affiliation-details', 'new'], { relativeTo: this.route.parent });
    } else if (option === 'Delete All') {
      this.networkAffiliationsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
        if (data) {
          this.pagesDataService.showToast({ title: "Network Affiliation Deleted", message: `All network affiliation deleted`, type: ToastEventTypeEnum.SUCCESS });
        }
      });
    }
  }

  protected onEditNetworkAffiliation(networkAff: ViewNetworkAffiliatioModel): void {
    this.router.navigate(['network-affiliation-details', networkAff.id], { relativeTo: this.route.parent });
   
  }

}
