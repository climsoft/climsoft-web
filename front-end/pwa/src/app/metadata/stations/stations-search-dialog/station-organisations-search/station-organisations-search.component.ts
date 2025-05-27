import { Component, Input, Output, EventEmitter, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { StationCacheModel, StationsCacheService } from '../../services/stations-cache.service';
import { Subject, takeUntil } from 'rxjs';
import { SelectionOptionTypeEnum } from '../stations-search-dialog.component';
import { OrganisationsCacheService } from 'src/app/metadata/organisations/services/organisations-cache.service';
import { ViewOrganisationModel } from 'src/app/metadata/organisations/models/view-organisation.model';

interface SearchModel {
  organisation: ViewOrganisationModel;
  selected: boolean;
}

@Component({
  selector: 'app-station-organisations-search',
  templateUrl: './station-organisations-search.component.html',
  styleUrls: ['./station-organisations-search.component.scss']
})
export class StationOrganisationsSearchComponent implements OnChanges, OnDestroy {
  @Input() public stations!: StationCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: SelectionOptionTypeEnum;
  @Output() public searchedIdsChange = new EventEmitter<string[]>();

  protected organisations: SearchModel[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private organisationsService: OrganisationsCacheService,
  ) {
    this.organisationsService.cachedOrganisations.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.organisations = data.map(organisation => {
        return {
          organisation: organisation, selected: false
        }
      });
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      this.onSearchInput(this.searchValue);
    }

    if (changes['selectionOption'] && this.selectionOption) {
      this.onOptionSelected(this.selectionOption);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private onSearchInput(searchValue: string): void {
    // Make the searched items be the first items
    this.organisations.sort((a, b) => {
      // If search is found, move it before `b`, otherwise after
      if (a.organisation.name.toLowerCase().includes(searchValue)) {
        return -1;
      }
      return 1;
    });
  }

  protected onSelected(selection: SearchModel): void {
    selection.selected = !selection.selected;
    this.emitSearchedStationIds();
  }

  private onOptionSelected(option: SelectionOptionTypeEnum): void {
    switch (option) {
      case SelectionOptionTypeEnum.SELECT_ALL:
        this.selectAll(true);
        break;
      case SelectionOptionTypeEnum.DESLECT_ALL:
        this.selectAll(false);
        break;
      case SelectionOptionTypeEnum.SORT_SELECTED:
        this.sortBySelected();
        break;
      default:
        break;
    }
  }

  private selectAll(select: boolean): void {
    for (const item of this.organisations) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.organisations.sort((a, b) => {
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
    const selectedOrganisations = this.organisations.filter(item => item.selected);
    for (const selectedorganisation of selectedOrganisations) {
      for (const station of this.stations) {
        if (station.organisationId === selectedorganisation.organisation.id) {
          searchedStationIds.push(station.id);
        }
      }
    }
    this.searchedIdsChange.emit(searchedStationIds);
    //}, 0);
  }



}
