import { Component, Output, EventEmitter, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AppDatabase, StationSearchHistoryModel } from 'src/app/app-database';
import { StationCacheModel, StationsCacheService } from '../services/stations-cache.service';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewportService, ViewPortSize } from 'src/app/core/services/view-port.service';
import { StationStatusEnum } from '../models/station-status.enum';
import { RegionsCacheService } from '../../regions/services/regions-cache.service';
import { ViewRegionModel } from '../../regions/models/view-region.model';
import { booleanPointInPolygon, multiPolygon, point } from '@turf/turf';
import { StationNetworkAffiliationsService } from '../services/station-network-affiliations.service';
import { StationProcessingMethodEnum } from '../models/station-processing-method.enum';

enum SelectionOptionTypeEnum {
  SELECT_ALL,
  DESELECT_ALL,
  SORT_SELECTED,
  SORT_BY_ID,
  SORT_BY_NAME,
}

interface StationSearchModel {
  station: StationCacheModel;
  selected: boolean;
}

interface StationFilterModel {
  selectedRegions: ViewRegionModel[],
  organisationIds: number[],
  stationIdsForSelectedNetworkAffiliations: string[],
  environmentIds: number[],
  focusIds: number[],
  processingIds: StationProcessingMethodEnum[],
  statusIds: StationStatusEnum[],
}

@Component({
  selector: 'app-stations-search-dialog',
  templateUrl: './stations-search-dialog.component.html',
  styleUrls: ['./stations-search-dialog.component.scss']
})
export class StationsSearchDialogComponent implements OnDestroy {
  @ViewChild('stnIdNameTableContainer', { read: ElementRef }) stnIdNameTableContainer!: ElementRef;

  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected open: boolean = false;
  protected activeTab!: 'new' | 'history';
  protected previousSearches!: StationSearchHistoryModel[];
  protected searchValue: string = '';
  protected selectionOptionTypeEnum: typeof SelectionOptionTypeEnum = SelectionOptionTypeEnum;
  protected searchName: string = '';
  protected saveSearch: boolean = false;

  protected allStations: StationCacheModel[] = [];

  // Holds the list of stations to search from
  protected stations: StationCacheModel[] = [];

  // Holds the filtered list of stations based on filter and search input
  protected filteredStations: StationSearchModel[] = [];

  protected filter: StationFilterModel = { selectedRegions: [], organisationIds: [], stationIdsForSelectedNetworkAffiliations: [], environmentIds: [], focusIds: [], processingIds: [], statusIds: [] };
  protected regions: ViewRegionModel[] = [];

  // Holds the ids of the selected elements, used by map viewer and is emitted on dialog OK click
  protected selectedIds: string[] = [];

  // used to determine whether to show the map viewer. On small screens the map viewer is hidden
  protected displayMapviewer: boolean = true;

  // to show/hide filter controls. By default hidden on dialog open
  protected displayFilterControls: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private viewPortService: ViewportService,
    private stationsCacheService: StationsCacheService,
    private regionsService: RegionsCacheService,
    private stationNetworkAffiliationsService: StationNetworkAffiliationsService,) {

    this.viewPortService.viewPortSize.pipe(
      takeUntil(this.destroy$),
    ).subscribe(viewPortSize => {
      this.displayMapviewer = viewPortSize === ViewPortSize.LARGE;
    });

    this.regionsService.cachedRegions.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.regions = data
    });

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allStations = data;
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public async showDialog(newSelectedIds?: string[], includeOnlyIds?: string[]): Promise<void> {
    this.searchValue = ''; // clear ay search value
    this.stations = includeOnlyIds && includeOnlyIds.length > 0 ?
      this.allStations.filter(item => includeOnlyIds.includes(item.id)) : this.allStations;

    if (newSelectedIds && newSelectedIds.length > 0) {
      this.activeTab = 'new';
      this.filteredStations = this.getFilteredStations(this.stations, this.filter, newSelectedIds);
      this.selectedIds = this.getSelectedStationIds(this.filteredStations);

      this.scrollToTop();
    } else if (this.activeTab === 'history') {
      this.loadSearchHistory();
    } else {
      // If it's the first time the dialog is being shown then load history 
      // and if not previous searches then just show new tab
      await this.loadSearchHistory();
      if (this.previousSearches.length === 0) {
        this.activeTab = 'new';
        this.filteredStations = this.getFilteredStations(this.stations, this.filter);
        this.selectedIds = this.getSelectedStationIds(this.filteredStations);
      } else {
        this.activeTab = 'history';
      }
    }

    // Show the dialog
    this.open = true;

  }

  protected onTabClick(selectedTab: 'new' | 'history'): void {
    this.searchName = '';
    this.saveSearch = false;
    this.filteredStations = this.getFilteredStations(this.stations, this.filter);
    this.selectedIds = this.getSelectedStationIds(this.filteredStations);
    this.activeTab = selectedTab;
    if (this.activeTab === 'history') this.loadSearchHistory();
  }

  private async loadSearchHistory(): Promise<void> {
    this.previousSearches = await AppDatabase.instance.stationsSearchHistory.toArray();
  }

  protected onPreviousSearchSelected(selectedSearch: StationSearchHistoryModel): void {
    if (this.searchName === selectedSearch.name) {
      // If same selection then remove selection
      this.searchName = '';
      this.filteredStations = this.getFilteredStations(this.stations, this.filter);
    } else {
      this.searchName = selectedSearch.name;
      this.filteredStations = this.getFilteredStations(this.stations, this.filter, selectedSearch.stationIds);
    }

    this.selectedIds = this.getSelectedStationIds(this.filteredStations);
  }

  protected onEditPreviousSearch(selectedSearch: StationSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.saveSearch = true;
    this.filteredStations = this.getFilteredStations(this.stations, this.filter, selectedSearch.stationIds);
    this.selectedIds = this.getSelectedStationIds(this.filteredStations);
    this.activeTab = 'new';
  }

  protected async onDeletePreviousSearch(selectedSearch: StationSearchHistoryModel): Promise<void> {
    await AppDatabase.instance.stationsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

  protected onRegionsSelected(selectedRegionIds: number[]): void {
    this.filter.selectedRegions = this.regions.filter(r => selectedRegionIds.includes(r.id));
    this.filteredStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds);
  }

  protected onOrganisationsSelected(selectedOrganisationIds: number[]): void {
    this.filter.organisationIds = selectedOrganisationIds;
    this.filteredStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds);
  }

  protected onNetworkAffiliationsSelected(selectedNetworkAffiliationIds: number[]): void {
    this.filter.stationIdsForSelectedNetworkAffiliations = []; // clear any previous values
    if (selectedNetworkAffiliationIds.length > 0) {
      this.stationNetworkAffiliationsService.getStationsAssignedToNetworkAffiliations(selectedNetworkAffiliationIds).pipe(
        take(1),
      ).subscribe((stationIds) => {
        this.filter.stationIdsForSelectedNetworkAffiliations = stationIds;
        this.filteredStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds);
      });
    } else {
      this.filteredStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds);
    }
  }

  protected onStationEnvironmentsSelected(selectedEnvironmentIds: number[]): void {
    this.filter.environmentIds = selectedEnvironmentIds;
    this.filteredStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds);
  }

  protected onStationFocusesSelected(selectedFocusIds: number[]): void {
    this.filter.focusIds = selectedFocusIds;
    this.filteredStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds);
  }

  protected onStationObsProcessingMethodSelected(selectedProcessingIds: StationProcessingMethodEnum[]): void {
    this.filter.processingIds = selectedProcessingIds;
    this.filteredStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds);
  }

  protected onStationStatusSelected(selectedStatusIds: StationStatusEnum[]): void {
    this.filter.statusIds = selectedStatusIds;
    this.filteredStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds);
  }

  protected onSearchInput(newSearchValue: string): void {
    // Using set timeout to improve typing UX of the search especially for devices like tablets and phones
    setTimeout(() => {
      const searchValue = newSearchValue.toLowerCase();

      const newFilterStations = this.getFilteredStations(this.stations, this.filter, this.selectedIds).filter(item => (
        item.station.id.toLowerCase().includes(searchValue)
        || item.station.name.toLowerCase().includes(searchValue)
        || item.station.wmoId.toLowerCase().includes(searchValue)
        || item.station.wigosId.toLowerCase().includes(searchValue)
        || item.station.icaoId.toLowerCase().includes(searchValue)
      ));

      // Sort the filtered stations
      newFilterStations.sort((a, b) => (
        a.station.id.localeCompare(b.station.id)
        || a.station.name.localeCompare(b.station.name)
        || a.station.wmoId.localeCompare(b.station.wmoId)
        || a.station.wigosId.localeCompare(b.station.wigosId)
        || a.station.icaoId.localeCompare(b.station.icaoId)
      ));

      // Important. Don't set the selected ids here because nothing has been selected.
      this.filteredStations = newFilterStations;

      this.scrollToTop();
    }, 0);
  }

  protected onSelectionOptionClick(option: SelectionOptionTypeEnum): void {
    const newFilteredOptions = this.getFilteredStations(this.stations, this.filter, this.selectedIds);

    switch (option) {
      case SelectionOptionTypeEnum.SORT_SELECTED:
        // Sort the array so that items with `selected: true` come first
        newFilteredOptions.sort((a, b) => {
          if (a.selected === b.selected) {
            return 0; // If both are the same (either true or false), leave their order unchanged
          }
          return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
        });
        break;
      case SelectionOptionTypeEnum.SORT_BY_ID:
        newFilteredOptions.sort((a, b) => a.station.id.localeCompare(b.station.id));
        break;
      case SelectionOptionTypeEnum.SORT_BY_NAME:
        newFilteredOptions.sort((a, b) => a.station.name.localeCompare(b.station.name));
        break;
      case SelectionOptionTypeEnum.SELECT_ALL:
        for (const item of newFilteredOptions) {
          item.selected = true;
        }
        break;
      case SelectionOptionTypeEnum.DESELECT_ALL:
        for (const item of newFilteredOptions) {
          item.selected = false;
        }
        break;
      default:
        break;
    }

    this.filteredStations = newFilteredOptions;
    this.selectedIds = this.getSelectedStationIds(this.filteredStations);

    this.scrollToTop();
  }

  protected onSelectedClick(stationSelection: StationSearchModel): void {
    stationSelection.selected = !stationSelection.selected;
    const index = this.selectedIds.indexOf(stationSelection.station.id);

    if (stationSelection.selected && index === -1) {
      // If selected and not already in the selected list then add it
      this.selectedIds.push(stationSelection.station.id);
    } else if (!stationSelection.selected && index > -1) {
      // If deselected and is in the selected list then remove it
      this.selectedIds.splice(index, 1);
    }

    // TODO. 
    // Investigate why map viewer doen't display stations on the map.
    // Can the map viewer be made to to listen for changes in the elements of the array itself?
    this.selectedIds = [...this.selectedIds];
  }

  protected onEnterKeyPress(): void {
    this.onSelectedClick(this.filteredStations[0]);
  }


  /**
    * Gets the filtered stations and sorts them based on selected Ids
    * @param stations 
    * @param selectedIds 
    * @returns 
    */
  private getFilteredStations(stations: StationCacheModel[], filter: StationFilterModel, selectedIds?: string[]): StationSearchModel[] {
    const visibleStations: StationCacheModel[] = stations.filter(item => {
      // Filter by region
      if (filter.selectedRegions.length > 0) {
        if (!item.location) {
          return false;
        } else if (!this.isStationInRegions(filter.selectedRegions, item.location)) {
          return false;
        }
      }

      // Filter by organisation
      if (filter.organisationIds.length > 0) {
        if (!item.organisationId) {
          return false;
        } else if (!filter.organisationIds.includes(item.organisationId)) {
          return false;
        }
      }

      // Filter by network affiliation
      if (filter.stationIdsForSelectedNetworkAffiliations.length > 0 &&
        !filter.stationIdsForSelectedNetworkAffiliations.includes(item.id)) {
        return false;
      }

      // Filter by environment
      if (filter.environmentIds.length > 0) {
        if (!item.stationObsEnvironmentId) {
          return false;
        } else if (!filter.environmentIds.includes(item.stationObsEnvironmentId)) {
          return false;
        }
      }

      // Filter by focus
      if (filter.focusIds.length > 0) {
        if (!item.stationObsFocusId) {
          return false;
        } else if (!filter.focusIds.includes(item.stationObsFocusId)) {
          return false;
        }
      }

      // Filter by processing method
      if (filter.processingIds.length > 0) {
        if (!item.stationObsProcessingMethod) {
          return false;
        } else if (!filter.processingIds.includes(item.stationObsProcessingMethod)) {
          return false;
        }
      }

      // Filter by status
      if (filter.statusIds.length > 0) {
        if (!item.status) {
          return false;
        } else if (!filter.statusIds.includes(item.status)) {
          return false;
        }
      }

      return true;
    });

    let newFilteredStations: StationSearchModel[];

    if (selectedIds && selectedIds.length > 0) {
      newFilteredStations = [];
      for (const station of visibleStations) {
        newFilteredStations.push({ station: station, selected: selectedIds.includes(station.id) });
      }

      //----------------------------------------------------------------
      // Sort filtered options to have the selectedIds as first items in the filtered options array
      //----------------------------------------------------------------
      // Create a map for quick lookups of the desired order.
      const orderMap = new Map(selectedIds.map((idValue, index) => [idValue, index]));
      newFilteredStations.sort((a, b) => {
        const aInSelected = orderMap.has(a.station.id);
        const bInSelected = orderMap.has(b.station.id);

        // If both are in selectedIds, sort by their order in selectedIds
        if (aInSelected && bInSelected) {
          return orderMap.get(a.station.id)! - orderMap.get(b.station.id)!;
        }
        if (aInSelected) return -1; // a comes first
        if (bInSelected) return 1;  // b comes first 
        return 0; // Keep original order for unselected items
      });
    } else {
      newFilteredStations = visibleStations.map(item => {
        return { station: item, selected: false };
      });
    }

    return newFilteredStations;
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

  private getSelectedStationIds(filteredStations: StationSearchModel[]): string[] {
    const newSelectedIds: string[] = [];
    for (const selection of filteredStations) {
      if (selection.selected) {
        newSelectedIds.push(selection.station.id);
      }
    }

    return newSelectedIds;
  }

  protected onDragDrop(event: CdkDragDrop<StationSearchModel[]>): void {
    //console.log('Drop event:', event);
    moveItemInArray(this.filteredStations, event.previousIndex, event.currentIndex);
    // Note. the template disables drag and drop when no search value is entered. So the filtered elements are all valid posible selections.
    this.selectedIds = this.getSelectedStationIds(this.filteredStations);
  }

  protected onOkClick(): void {
    this.searchName = this.searchName.trim();
    if (this.saveSearch && this.searchName && this.selectedIds.length > 0) {
      AppDatabase.instance.stationsSearchHistory.put({ name: this.searchName, stationIds: this.selectedIds });
    }
    this.searchedIdsChange.emit(this.selectedIds);
  }

  private scrollToTop(): void {
    // Use setTimeout to scroll after the view has been updated with the sorted list.
    setTimeout(() => {
      if (this.stnIdNameTableContainer && this.stnIdNameTableContainer.nativeElement) {
        this.stnIdNameTableContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0);
  }

}
