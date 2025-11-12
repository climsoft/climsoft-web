import { Component, Output, EventEmitter, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { StationSearchHistoryModel } from '../models/stations-search-history.model';
import { StationCacheModel } from '../services/stations-cache.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewportService, ViewPortSize } from 'src/app/core/services/view-port.service';
import { CachedMetadataService } from '../../metadata-updates/cached-metadata.service';
import { StationStatusEnum } from '../models/station-status.enum';
import { StationObsProcessingMethodEnum } from '../models/station-obs-processing-method.enum';
import { RegionsCacheService } from '../../regions/services/regions-cache.service';
import { ViewRegionModel } from '../../regions/models/view-region.model';
import { booleanPointInPolygon, multiPolygon, point } from '@turf/turf';
import { StationNetworkAffiliationsService } from '../services/station-network-affiliations.service';

export enum SelectionOptionTypeEnum {
  SELECT_ALL,
  DESELECT_ALL,
  SORT_SELECTED,
  SORT_BY_ID,
  SORT_BY_NAME,
}

// export enum SearchByOptionEnum {
//   ID_NAME = 'Id or Name',
//   REGION = 'Region',
//   ORGANISATION = "Organisation",
//   NETWORK_AFFILIATION = "Network Affiliation",
//   STATUS = "Status",
//   PROCESSING = "Processing",
//   ENVIRONMENT = "Environment",
//   FOCUS = "Focus",
// }

interface StationSearchModel {
  station: StationCacheModel;
  selected: boolean;
}

@Component({
  selector: 'app-stations-search-dialog',
  templateUrl: './stations-search-dialog.component.html',
  styleUrls: ['./stations-search-dialog.component.scss']
})
export class StationsSearchDialogComponent implements OnDestroy {
  @ViewChild('stnIdNameTableContainer') stnIdNameTableContainer!: ElementRef;

  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected open: boolean = false;
  protected activeTab!: 'new' | 'history';
  protected previousSearches!: StationSearchHistoryModel[];
  protected searchName: string = '';
  protected saveSearch: boolean = false;
  protected selectionOptionTypeEnum: typeof SelectionOptionTypeEnum = SelectionOptionTypeEnum;
  protected stations!: StationCacheModel[]
  protected selections: StationSearchModel[] = [];
  protected regions: ViewRegionModel[] = [];
  protected filteredSelections: {
    selectedRegions: ViewRegionModel[],
    organisationIds: number[],
    stationsForSelectedNetworkAffiliations: string[],
    environmentIds: number[],
    focusIds: number[],
    processingIds: StationObsProcessingMethodEnum[],
    statusIds: StationStatusEnum[],
  } = { selectedRegions: [], organisationIds: [], stationsForSelectedNetworkAffiliations: [], environmentIds: [], focusIds: [], processingIds: [], statusIds: [] };

  // Used by map viewer
  protected searchedIds: string[] = [];

  // used to determine whether to show the map viewer
  // On small screens the map viewer is hidden
  protected displayMapviewer: boolean = true;

  // to show/hide filter controls. By default hidden on dialog open
  protected displayFilterControls: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private viewPortService: ViewportService,
    private cachedMetadataService: CachedMetadataService,
    private regionsService: RegionsCacheService,
    private stationNetworkAffiliationsService: StationNetworkAffiliationsService,) {
    this.viewPortService.viewPortSize.pipe(
      takeUntil(this.destroy$),
    ).subscribe((viewPortSize) => {
      this.displayMapviewer = viewPortSize === ViewPortSize.LARGE;
    });

    this.regionsService.cachedRegions.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.regions = data
    });



  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public async showDialog(selectedIds?: string[], includeOnlyIds?: string[]): Promise<void> {
    this.open = true;
    this.stations = includeOnlyIds && includeOnlyIds.length > 0 ?
      this.cachedMetadataService.stationsMetadata.filter(item => includeOnlyIds.includes(item.id)) :
      this.cachedMetadataService.stationsMetadata;

    if (selectedIds && selectedIds.length > 0) {
      this.activeTab = 'new';
      this.filterBasedOnSelections(selectedIds);
    } else if (this.activeTab === 'history') {
      this.loadSearchHistory();
    } else {
      // If it's the first time the dialog is being shown then load history 
      // and if not previous searches then just show new tab
      await this.loadSearchHistory();
      if (this.previousSearches.length === 0) {
        this.activeTab = 'new';
        this.filterBasedOnSelections();
      } else {
        this.activeTab = 'history';
      }
    }
  }

  protected onTabClick(selectedTab: 'new' | 'history'): void {
    this.searchName = '';
    this.saveSearch = false;
    this.filterBasedOnSelections();
    this.activeTab = selectedTab;
    if (this.activeTab === 'history') this.loadSearchHistory();
  }

  private async loadSearchHistory(): Promise<void> {
    this.previousSearches = await AppDatabase.instance.stationsSearchHistory.toArray();
  }

  protected onPreviousSearchSelected(selectedSearch: StationSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.filterBasedOnSelections(selectedSearch.stationIds);
  }

  protected onEditPreviousSearch(selectedSearch: StationSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.saveSearch = true;
    this.filterBasedOnSelections(selectedSearch.stationIds);
    this.activeTab = 'new';
  }

  protected async onDeletePreviousSearch(selectedSearch: StationSearchHistoryModel): Promise<void> {
    await AppDatabase.instance.stationsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

  protected onRegionsSelected(selectedIds: number[]): void {
    this.filteredSelections.selectedRegions = this.regions.filter(r => selectedIds.includes(r.id));
    this.filterBasedOnSelections();
  }

  protected onOrganisationsSelected(selectedIds: number[]): void {
    this.filteredSelections.organisationIds = selectedIds;
    this.filterBasedOnSelections();
  }

  protected onNetworkAffiliationsSelected(selectedIds: number[]): void {
    this.filteredSelections.stationsForSelectedNetworkAffiliations = [];
    if (selectedIds.length > 0) {
      this.stationNetworkAffiliationsService.getStationsAssignedToNetworkAffiliations(selectedIds).pipe(
        take(1),
      ).subscribe((stationIds) => {
        this.filteredSelections.stationsForSelectedNetworkAffiliations = stationIds;
        this.filterBasedOnSelections();
      });
    } else {
      this.filterBasedOnSelections();
    }
  }

  protected onStationEnvironmentsSelected(selectedIds: number[]): void {
    this.filteredSelections.environmentIds = selectedIds;
    this.filterBasedOnSelections();
  }

  protected onStationFocusesSelected(selectedIds: number[]): void {
    this.filteredSelections.focusIds = selectedIds;
    this.filterBasedOnSelections();
  }

  protected onStationObsProcessingMethodSelected(selectedIds: StationObsProcessingMethodEnum[]): void {
    this.filteredSelections.processingIds = selectedIds;
    this.filterBasedOnSelections();
  }

  protected onStationStatusSelected(selectedIds: StationStatusEnum[]): void {
    this.filteredSelections.statusIds = selectedIds;
    this.filterBasedOnSelections();
  }

  protected onSearchInput(newSearchValue: string): void {
    // Using set timeout to improve typing UX of the search especially for devices like tablets and phones
    setTimeout(() => {
      const searchValue = newSearchValue.toLowerCase();
      // Make the searched items be the first items
      this.selections.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.station.id.toLowerCase().includes(searchValue)
          || a.station.name.toLowerCase().includes(searchValue)
          || a.station.wmoId.toLowerCase().includes(searchValue)
          || a.station.wigosId.toLowerCase().includes(searchValue)
          || a.station.icaoId.toLowerCase().includes(searchValue)) {
          return -1;
        }
        return 1;
      });

      this.scrollToTop();
    }, 0);
  }

  protected onSelectionOptionClick(option: SelectionOptionTypeEnum): void {
    switch (option) {
      case SelectionOptionTypeEnum.SORT_SELECTED:
        // Sort the array so that items with `selected: true` come first
        this.selections.sort((a, b) => {
          if (a.selected === b.selected) {
            return 0; // If both are the same (either true or false), leave their order unchanged
          }
          return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
        });
        this.scrollToTop();
        break;
      case SelectionOptionTypeEnum.SORT_BY_ID:
        this.selections.sort((a, b) => a.station.id.localeCompare(b.station.id));
        this.scrollToTop();
        break;
      case SelectionOptionTypeEnum.SORT_BY_NAME:
        this.selections.sort((a, b) => a.station.name.localeCompare(b.station.name));
        this.scrollToTop();
        break;
      case SelectionOptionTypeEnum.SELECT_ALL:
        this.selectAll(true);
        break;
      case SelectionOptionTypeEnum.DESELECT_ALL:
        this.selectAll(false);
        break;
      default:
        break;
    }
  }

  private selectAll(select: boolean): void {
    for (const item of this.selections) {
      item.selected = select;
    }
    this.setSearchedIds();
  }

  private scrollToTop(): void {
    // Use setTimeout to scroll after the view has been updated with the sorted list.
    setTimeout(() => {
      if (this.stnIdNameTableContainer && this.stnIdNameTableContainer.nativeElement) {
        this.stnIdNameTableContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

  protected onSelected(stationSelection: StationSearchModel): void {
    stationSelection.selected = !stationSelection.selected;
    this.setSearchedIds(); // TODO. Simply remove or add id from searchedIds array
  }

  protected setSearchedSelections1(searchedIds: string[]): void {
    for (const selection of this.selections) {
      selection.selected = searchedIds.includes(selection.station.id);
    }

    this.setSearchedIds();
  }

  private filterBasedOnSelections(selectedIds?: string[]): void {
    this.selections = this.stations.map(item => {
      return { station: item, selected: false };
    }).filter(item => {
      // Filter by region
      if (this.filteredSelections.selectedRegions.length > 0) {
        if (!item.station.location) {
          return false;
        } else if (!this.isStationInRegions(this.filteredSelections.selectedRegions, item.station.location)) {
          return false;
        }
      }

      // Filter by organisation
      if (this.filteredSelections.organisationIds.length > 0) {
        if (!item.station.organisationId) {
          return false;
        } else if (!this.filteredSelections.organisationIds.includes(item.station.organisationId)) {
          return false;
        }
      }

      // Filter by network affiliation
      if (this.filteredSelections.stationsForSelectedNetworkAffiliations.length > 0 &&
        !this.filteredSelections.stationsForSelectedNetworkAffiliations.includes(item.station.id)) {
        return false;
      }

      // Filter by environment
      if (this.filteredSelections.environmentIds.length > 0) {
        if (!item.station.stationObsEnvironmentId) {
          return false;
        } else if (!this.filteredSelections.environmentIds.includes(item.station.stationObsEnvironmentId)) {
          return false;
        }
      }

      // Filter by focus
      if (this.filteredSelections.focusIds.length > 0) {
        if (!item.station.stationObsFocusId) {
          return false;
        } else if (!this.filteredSelections.focusIds.includes(item.station.stationObsFocusId)) {
          return false;
        }
      }

      // Filter by processing method
      if (this.filteredSelections.processingIds.length > 0) {
        if (!item.station.stationObsProcessingMethod) {
          return false;
        } else if (!this.filteredSelections.processingIds.includes(item.station.stationObsProcessingMethod)) {
          return false;
        }
      }

      // Filter by status
      if (this.filteredSelections.statusIds.length > 0) {
        if (!item.station.status) {
          return false;
        } else if (!this.filteredSelections.statusIds.includes(item.station.status)) {
          return false;
        }
      }

      return true;
    });

    if (selectedIds && selectedIds.length > 0) {
      for (const selection of this.selections) {
        selection.selected = selectedIds.includes(selection.station.id);
      }
    }

    this.setSearchedIds();
  }

  public isStationInRegions(regions: ViewRegionModel[], location: { longitude: number; latitude: number; }): boolean {
    const stationPoint = point([location.longitude, location.latitude]);
    for (const region of regions) {
      if (booleanPointInPolygon(stationPoint, multiPolygon(region.boundary))) {
        return true;
      }
    }
    return false;
  }

  private setSearchedIds(): void {
    const newSearchedIds: string[] = [];
    for (const selection of this.selections) {
      if (selection.selected) {
        newSearchedIds.push(selection.station.id);
      }
    }

    this.searchedIds = newSearchedIds;
  }

  protected onOkClick(): void {
    this.searchName = this.searchName.trim();

    const searchedIds: string[] = [];

    for (const selection of this.selections) {
      if (selection.selected) {
        searchedIds.push(selection.station.id);
      }
    }

    if (this.searchName && searchedIds.length > 0) {
      AppDatabase.instance.stationsSearchHistory.put({ name: this.searchName, stationIds: searchedIds });
    }
    this.searchedIdsChange.emit(searchedIds);
  }

}
