import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';
import { Subject, take, takeUntil } from 'rxjs';
import { SelectionOptionTypeEnum } from '../stations-search-dialog.component';
import { NetworkAffiliationsCacheService } from 'src/app/metadata/network-affiliations/services/network-affiliations-cache.service';
import { ViewNetworkAffiliationModel } from 'src/app/metadata/network-affiliations/models/view-network-affiliation.model';
import { StationNetworkAffiliationsService } from '../../services/station-network-affiliations.service';

interface SearchModel {
  networkAffiliation: ViewNetworkAffiliationModel;
  selected: boolean;
}

@Component({
  selector: 'app-station-network-affiliations-search',
  templateUrl: './station-network-affiliations-search.component.html',
  styleUrls: ['./station-network-affiliations-search.component.scss']
})
export class StationNetworkAffiliationsSearchComponent implements OnChanges, OnDestroy {
  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected networkAffiliations: SearchModel[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private networkAffiliationsCacheService: NetworkAffiliationsCacheService,
    private stationNetworkAffiliationsService: StationNetworkAffiliationsService,
  ) {
    // Get all regions 
    this.networkAffiliationsCacheService.cachedNetworkAffiliations.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.networkAffiliations = data.map(networkAffiliation => {
        return {
          networkAffiliation: networkAffiliation, selected: false
        }
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.networkAffiliations.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.networkAffiliation.name.toLowerCase().includes(this.searchValue)) {
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

  protected onSelected(selection: SearchModel): void {
    selection.selected = !selection.selected;
    this.emitSearchedStationIds();
  }

  private selectAll(select: boolean): void {
    for (const item of this.networkAffiliations) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.networkAffiliations.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private emitSearchedStationIds() {
    const selectedAffiliationIds: number[] = this.networkAffiliations.filter(item => item.selected).map(item => item.networkAffiliation.id);
    if (selectedAffiliationIds.length > 0) {
      this.stationNetworkAffiliationsService.getStationsAssignedToNetworkAffiliations(selectedAffiliationIds).pipe(
        take(1),
      ).subscribe((allStationIds) => {
        const allowedStationIds: string[] = [];
        for (const stationId of allStationIds) {
          const station = this.stations.find(item => item.id === stationId);
          if (station) {
            allowedStationIds.push(stationId);
          }
        }
        this.searchedIdsChange.emit(allowedStationIds);
      });
    } else {
      this.searchedIdsChange.emit([]);
    }

  }

}
