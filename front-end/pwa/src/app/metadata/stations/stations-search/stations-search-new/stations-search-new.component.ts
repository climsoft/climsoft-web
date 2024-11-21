import { Component, Output, EventEmitter, Input, SimpleChanges, OnChanges } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache-service';

interface StationSearchModel {
  station: StationCacheModel;
  selected: boolean;
}

@Component({
  selector: 'app-stations-search-new',
  templateUrl: './stations-search-new.component.html',
  styleUrls: ['./stations-search-new.component.scss']
})
export class StationsSearchNewComponent implements OnChanges {

  @Input()
  public selectIds!: string[];

  @Input()
  public defaultSearchName!: string;

  @Output()
  public idsSelectedChange = new EventEmitter<string[]>();

  @Output()
  public searchNameChange = new EventEmitter<string>();

  protected saveSearch: boolean = false; 
  protected stationsSelections!: StationSearchModel[];
  protected selectedCount: number = 0;

  constructor(private stationsCacheService: StationsCacheService) {

    // Load the stations
    this.stationsCacheService.cachedStations.subscribe(stations => {
      this.stationsSelections = stations.map(station => {
        return {
          station: station,
          selected: false,
        };
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.selectIds && this.selectIds.length > 0) {
      this.selectedCount = 0;
      for (const item of this.stationsSelections) {
        item.selected = this.selectIds.includes(item.station.id);
        if (item.selected) {
          this.selectedCount++;
        }
      }
    }

    if (this.defaultSearchName) {
      this.saveSearch = true;
    }
  }


  protected onSearch(searchValue: string): void {
    // Make the searched items be the first items
    this.stationsSelections.sort((a, b) => {
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
  }

  protected onOptionClick(options: 'Filter' | 'Select All' | 'Deselect All' | 'Sort Selected'): void {
    switch (options) {
      case 'Filter':
        // TODO
        break;
      case 'Select All':
        this.selectAll(true);
        break;
      case 'Deselect All':
        this.selectAll(false);
        break;
      case 'Sort Selected':
        this.sortSelectionBySelected();
        break;
      default:
        break;
    }

  }

  protected onSelected(stationSelection: StationSearchModel, selected: boolean): void {
    stationSelection.selected = selected;
    this.emitSelected()
  }

  private selectAll(select: boolean): void {
    for (const item of this.stationsSelections) {
      item.selected = select;
    }

    this.emitSelected()
  }


  private sortSelectionBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.stationsSelections.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private emitSelected(): void {
    const selected = this.stationsSelections.filter(item => item.selected).map(item => item.station.id)
    this.selectedCount = selected.length;
    this.idsSelectedChange.emit(selected);
  }

  protected onSearchNameInput(searchName: string) {
    this.searchNameChange.emit(searchName);
  }




}
