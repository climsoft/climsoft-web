import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';
import { RegionsCacheService } from 'src/app/metadata/regions/services/regions-cache.service';
import { ViewRegionModel } from 'src/app/metadata/regions/models/view-region.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { SelectionOptionTypeEnum } from '../stations-search-dialog.component';
import { booleanPointInPolygon, multiPolygon, point } from '@turf/turf';

interface SearchModel {
  region: ViewRegionModel;
  selected: boolean;
  formattedRegionType: string;
}

@Component({
  selector: 'app-station-regions-search',
  templateUrl: './station-regions-search.component.html',
  styleUrls: ['./station-regions-search.component.scss']
})
export class StationRegionSearchComponent implements OnChanges, OnDestroy {
  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected regions: SearchModel[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private regionsService: RegionsCacheService,
  ) {
    // Get all regions 
    this.regionsService.cachedRegions.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.regions = data.map(region => {
        return {
          region: region, selected: false, formattedRegionType: StringUtils.formatEnumForDisplay(region.regionType)
        }
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.regions.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.region.name.toLowerCase().includes(this.searchValue)
          || a.region.regionType.toLowerCase().includes(this.searchValue)) {
          return -1;
        }
        return 1;
      });
    }

    if (changes['selectionOption'] && this.selectionOption) {
      switch (this.selectionOption.value) {
        case SelectionOptionTypeEnum.SELECT_ALL:
          this.selectAll(true);
          break;
        case SelectionOptionTypeEnum.DESELECT_ALL:
          this.selectAll(false);
          break;
        case SelectionOptionTypeEnum.SORT_SELECTED:
          this.sortBySelected();
          break;
        default:
          break;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSelected(regionSelection: SearchModel): void {
    regionSelection.selected = !regionSelection.selected;
    this.emitSearchedStationIds();
  }


  private selectAll(select: boolean): void {
    for (const item of this.regions) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.regions.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private emitSearchedStationIds() {
    // TODO. a hack around due to event after view errors: Investigate later.
    //setTimeout(() => {
    const searchedStationIds: string[] = [];
    const selectedRegions = this.regions.filter(region => region.selected);
    for (const selectedRegion of selectedRegions) {
      for (const station of this.stations) {
        if (station.location) {
          if (this.isStationInRegion(station.location, selectedRegion.region.boundary)) {
            searchedStationIds.push(station.id);
          }
        }
      }
    }

    this.searchedIdsChange.emit(searchedStationIds);
    // }, 0);
  }


  public isStationInRegion(location: { longitude: number; latitude: number; }, boundary: number[][][][]): boolean {
    const stationPoint = point([location.longitude, location.latitude]);
    const regionPolygon = multiPolygon(boundary);
    return booleanPointInPolygon(stationPoint, regionPolygon);
  }


}
