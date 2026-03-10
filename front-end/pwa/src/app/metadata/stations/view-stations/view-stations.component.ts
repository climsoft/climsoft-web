import { Component, OnDestroy, ViewChild } from '@angular/core';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { OptionEnum } from 'src/app/shared/options.enum';
import { CreateStationModel } from '../models/create-station.model';
import { BulkEditStationsDialogComponent } from '../bulk-edit-stations-dialog/bulk-edit-stations-dialog.component';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { StationInputDialogComponent } from '../station-input-dialog/station-input-dialog.component';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

@Component({
  selector: 'app-view-stations',
  templateUrl: './view-stations.component.html',
  styleUrls: ['./view-stations.component.scss']
})
export class ViewStationsComponent implements OnDestroy {
  @ViewChild('dlgBulkEditStations') dlgBulkEditStations!: BulkEditStationsDialogComponent;
  @ViewChild('dlgStationInput') dlgStationInput!: StationInputDialogComponent;
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;

  protected allStations: StationCacheModel[] = [];
  protected stations: StationCacheModel[] = [];
  protected searchedIds: string[] = [];

  protected sortedStations: StationCacheModel[] = [];
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  protected dropDownItems: OptionEnum[] = [];
  protected visualiseItems: string[] = ['Geo Map', 'Tree Map'];
  protected showGeoMapDialog = false;
  protected showTreeMapDialog = false;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private stationsCacheService: StationsCacheService,) {

    this.pagesDataService.setPageHeader('Stations');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
      this.dropDownItems = [OptionEnum.DOWNLOAD];
      if (this.isSystemAdmin) {
        this.dropDownItems.push(OptionEnum.DELETE_ALL);
      }
    });

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allStations = data;
      // Always call filtered search ids because when the cache refreshes, the selected ids will not be the ones shown
      this.filterSearchedIds();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): StationCacheModel[] {
    return this.sortedStations.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
  }

  protected onSearchInput(searchedIds: string[]): void {
    this.searchedIds = searchedIds;
    this.filterSearchedIds();
  }

  private filterSearchedIds(): void {
    this.stations = this.searchedIds?.length > 0
      ? this.allStations.filter(item => this.searchedIds.includes(item.id))
      : [...this.allStations];
    this.sortedStations = [...this.stations];
    this.applySort();
    this.updatePaging();
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.sortedStations.length);
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
    this.sortedStations.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      if (this.sortColumn === 'latitude') {
        aVal = a.location?.latitude;
        bVal = b.location?.latitude;
      } else if (this.sortColumn === 'longitude') {
        aVal = a.location?.longitude;
        bVal = b.location?.longitude;
      } else {
        aVal = (a as any)[this.sortColumn];
        bVal = (b as any)[this.sortColumn];
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }

  protected onAddClick(): void {
    if (this.isSystemAdmin) {
      this.dlgStationInput.showDialog();
    }
  }

  protected onEditClick(stationId: string): void {
    if (this.isSystemAdmin) {
      this.dlgStationInput.showDialog(stationId);
    }
  }

  protected onOptionsClick(option: OptionEnum): void {
    switch (option) {
      case OptionEnum.DELETE_ALL:
        this.dlgDeleteAllConfirm.openDialog();
        break;
      default:
        break;
    }
  }

  protected onDeleteAllConfirm(): void {
    this.stationsCacheService.deleteAll().pipe(
      take(1),
    ).subscribe(data => {
      this.pagesDataService.showToast({ title: "Stations Deleted", message: `All stations deleted`, type: ToastEventTypeEnum.SUCCESS });
    });
  }

  protected onBulkEditClick(): void {
    if (this.isSystemAdmin) {
      const createModels: CreateStationModel[] = this.stations.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || undefined,
        latitude: s.location?.latitude,
        longitude: s.location?.longitude,
        elevation: s.elevation ?? undefined,
        stationObsProcessingMethod: s.stationObsProcessingMethod ?? undefined,
        stationObsEnvironmentId: s.stationObsEnvironmentId || undefined,
        stationObsFocusId: s.stationObsFocusId || undefined,
        ownerId: s.ownerId || undefined,
        operatorId: s.operatorId || undefined,
        wmoId: s.wmoId || undefined,
        wigosId: s.wigosId || undefined,
        icaoId: s.icaoId || undefined,
        status: s.status ?? undefined,
        dateEstablished: s.dateEstablished || undefined,
        dateClosed: s.dateClosed || undefined,
        comment: s.comment || undefined,
      }));
      this.dlgBulkEditStations.showDialog(createModels);
    }
  }

  protected onVisualiseClick(option: string): void {
    if (option === 'Geo Map') {
      this.showGeoMapDialog = true;
    } else if (option === 'Tree Map') {
      this.showTreeMapDialog = true;
    }
  }

  protected get downloadLink(): string {
    return this.stationsCacheService.downloadLink;
  }

}
