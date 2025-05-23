import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ViewNetworkAffiliationModel } from '../models/view-network-affiliation.model';
import { NetworkAffiliationCacheModel, NetworkAffiliationsCacheService } from '../services/network-affiliations-cache.service';
import { StationNetworkAffiliationsService } from '../../stations/services/station-network-affiliations.service';
import { StationsSearchDialogComponent } from '../../stations/stations-search-dialog/stations-search-dialog.component';

type optionsType = 'Add' | 'Delete All';

interface View extends NetworkAffiliationCacheModel {
  assignedStations: number;
}

@Component({
  selector: 'app-view-network-affiliations',
  templateUrl: './view-network-affiliations.component.html',
  styleUrls: ['./view-network-affiliations.component.scss']
})
export class ViewNetworkAffiliationsComponent implements OnDestroy {
  @ViewChild('appSearchAssignedStations') appStationSearchDialog!: StationsSearchDialogComponent;
  protected networkAffiliations!: View[];
  protected dropDownItems: optionsType[] = [];
  protected selectedNetwork!: View;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private networkAffiliationsCacheService: NetworkAffiliationsCacheService,
    private stationNetworkAffiliationsService: StationNetworkAffiliationsService,
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
    ).subscribe(data => {

      this.networkAffiliations = data.map(item => {
        return { ...item, assignedStations: 0 }
      });

      // Get number of stations assigned to use form
      this.stationNetworkAffiliationsService.getStationCountPerNetworkAffiliation().pipe(
        take(1),
      ).subscribe((stationsCountPerNetwork) => {
        for (const count of stationsCountPerNetwork) {
          const network = this.networkAffiliations.find(item => item.id === count.networkAffiliationId);
          if (network) {
            network.assignedStations = count.stationCount
          }
        }
      });
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

  protected onEditNetworkAffiliation(networkAff: View): void {
    this.router.navigate(['network-affiliation-details', networkAff.id], { relativeTo: this.route.parent });

  }


  protected onAssignStationsClicked(selectedSource: View) {
    this.selectedNetwork = selectedSource;
    this.stationNetworkAffiliationsService.getStationsAssignedToNetworkAffiliations([selectedSource.id]).pipe(
      take(1),
    ).subscribe((data) => {
      this.appStationSearchDialog.showDialog(data);
    });
  }

  protected onAssignNetworkToStationsInput(stationIds: string[]): void {
    this.stationNetworkAffiliationsService.putStationsAssignedToNetworkAffiliation(this.selectedNetwork.id, stationIds).pipe(
      take(1)
    ).subscribe(data => {
      this.selectedNetwork.assignedStations = data.length;
    });
  }

}
