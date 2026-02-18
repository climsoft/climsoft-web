import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { NetworkAffiliationCacheModel, NetworkAffiliationsCacheService } from '../services/network-affiliations-cache.service';
import { StationNetworkAffiliationsService } from '../../stations/services/station-network-affiliations.service';
import { StationsSearchDialogComponent } from '../../stations/stations-search-dialog/stations-search-dialog.component';
import { NetworkAffiliationInputDialogComponent } from '../network-affiliation-input-dialog/network-affiliation-input-dialog.component';

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
  @ViewChild('dlgNetworkDetails') dlgNetworkDetails!: NetworkAffiliationInputDialogComponent;
  protected networkAffiliations!: View[];
  protected selectedNetwork!: View;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private networkAffiliationsCacheService: NetworkAffiliationsCacheService,
    private stationNetworkAffiliationsService: StationNetworkAffiliationsService,
  ) {

    this.pagesDataService.setPageHeader('Network Affiliations');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
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
      this.dlgNetworkDetails.openDialog();
    } else if (option === 'Delete All') {
      this.networkAffiliationsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
        if (data) {
          this.pagesDataService.showToast({ title: 'Network Affiliation Deleted', message: 'All network affiliation deleted', type: ToastEventTypeEnum.SUCCESS });
        }
      });
    }
  }

  protected onEditNetworkAffiliation(networkAff: View): void {
    this.dlgNetworkDetails.openDialog(networkAff.id);
  }

  protected onAssignStationsClicked(selectedSource: View) {
    this.selectedNetwork = selectedSource;
    this.stationNetworkAffiliationsService.getStationsAssignedToNetworkAffiliations([selectedSource.id]).pipe(
      take(1),
    ).subscribe(stationIds => {
      this.appStationSearchDialog.showDialog(stationIds);
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
