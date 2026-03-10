import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { NetworkAffiliationCacheModel, NetworkAffiliationsCacheService } from '../services/network-affiliations-cache.service';
import { StationNetworkAffiliationsService } from '../../stations/services/station-network-affiliations.service';
import { StationsSearchDialogComponent } from '../../stations/stations-search-dialog/stations-search-dialog.component';
import { NetworkAffiliationInputDialogComponent } from '../network-affiliation-input-dialog/network-affiliation-input-dialog.component';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

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
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;

  protected networkAffiliations: View[] = [];
  protected selectedNetwork!: View;
  protected isSystemAdmin: boolean = false;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

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
      this.applySort();
      this.updatePaging();

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
      this.dlgDeleteAllConfirm.openDialog();
    }
  }

  protected onDeleteAllConfirm(): void {
    this.networkAffiliationsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
      this.pagesDataService.showToast({ title: 'Network Affiliation Deleted', message: 'All network affiliation deleted', type: ToastEventTypeEnum.SUCCESS });
    });
  }

  protected onEditNetworkAffiliation(networkAff: View, event: Event): void {
    event.stopPropagation();
    this.dlgNetworkDetails.openDialog(networkAff.id);
  }

  protected onAssignStationsClicked(selectedSource: View, event: Event) {
    event.stopPropagation();
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

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): View[] {
    return this.networkAffiliations.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
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
    this.networkAffiliations.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.networkAffiliations.length);
  }

}
