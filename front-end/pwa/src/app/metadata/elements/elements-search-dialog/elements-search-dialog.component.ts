import { Component, Output, EventEmitter } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { ElementSearchHistoryModel } from '../models/elements-search-history.model';
import { ElementCacheModel } from '../services/elements-cache.service';
import { CachedMetadataService } from '../../metadata-updates/cached-metadata.service';

export enum SelectionOptionTypeEnum {
  SELECT_ALL,
  DESELECT_ALL,
  SORT_SELECTED,
  SORT_BY_ID,
  SORT_BY_NAME,
}

export enum SearchByOptionEnum {
  ID_NAME = 'Id or Name',
  DOMAIN = 'Domain',
  SUB_DOMAIN = "Sub-domain",
}

@Component({
  selector: 'app-elements-search-dialog',
  templateUrl: './elements-search-dialog.component.html',
  styleUrls: ['./elements-search-dialog.component.scss']
})
export class ElementsSearchDialogComponent {

  @Output()
  public searchedIdsChange = new EventEmitter<number[]>();

  protected open: boolean = false;
  protected activeTab!: 'new' | 'history' ;
  protected previousSearches!: ElementSearchHistoryModel[];
  protected searchName: string = '';
  protected saveSearch: boolean = false;
  protected searchByOptionEnum: typeof SearchByOptionEnum = SearchByOptionEnum;
  protected searchBy: SearchByOptionEnum = SearchByOptionEnum.ID_NAME;
  protected searchValue: string = '';

  // Note. Angular does not call ngOnChanges() if the input value doesn’t change by reference across detection cycles.
  // So use object for selection to enforce change detection. 
  // This is required for instance when sort selection is clicked several times.
  protected selectionOption!: { value: SelectionOptionTypeEnum };
  protected selectionOptionTypeEnum: typeof SelectionOptionTypeEnum = SelectionOptionTypeEnum;

  protected elements: ElementCacheModel[] = [];
  protected searchedIds: number[] = [];
  protected largeScreen: boolean = true; // used to determine whether to show the map viewer

  constructor(private cachedMetadataService: CachedMetadataService) {
  }

  public async showDialog(selectedIds?: number[], includeOnlyIds?: number[]): Promise<void> {
    this.open = true;
    this.elements = includeOnlyIds && includeOnlyIds.length > 0 ?
      this.cachedMetadataService.elementsMetadata.filter(item => includeOnlyIds.includes(item.id)) :
      this.cachedMetadataService.elementsMetadata;

    // Set selected ids from a new copy of the array not same reference array
    // This makes sure that controls that call the dialog are not affect by how the dialog internally manipulates searched ids
    // especially when okay is not clicked
    this.setSearchedIds(selectedIds ? [...selectedIds] : []);
    if (this.searchedIds.length > 0) {
      this.activeTab = 'new';
      this.searchBy = SearchByOptionEnum.ID_NAME; 
    } else if (this.activeTab === 'new') {
      this.searchBy = SearchByOptionEnum.ID_NAME;
    } else if (this.activeTab === 'history') {
      this.loadSearchHistory(); 
    } else { 
      // If it's the first time the dialog is being shown then load history 
      // and if not previous searches then just show new tab
      await this.loadSearchHistory();
      if (this.previousSearches.length === 0) {
        this.activeTab = 'new';
        this.searchBy = SearchByOptionEnum.ID_NAME;       
      } else {
        this.activeTab = 'history';
      }
       
    }

   
  }

  protected onTabClick(selectedTab: 'new' | 'history'): void {
    this.searchName = '';
    this.saveSearch = false;
    this.setSearchedIds([]);
    this.activeTab = selectedTab;
    if (this.activeTab === 'history') this.loadSearchHistory();
  }

  private async loadSearchHistory(): Promise<void> {
    this.previousSearches = await AppDatabase.instance.elementsSearchHistory.toArray();
  }

  protected onPreviousSearchSelected(selectedSearch: ElementSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.setSearchedIds(selectedSearch.elementIds);
  }

  protected onEditPreviousSearch(selectedSearch: ElementSearchHistoryModel): void {
    this.searchBy = SearchByOptionEnum.ID_NAME;
    this.searchName = selectedSearch.name;
    this.saveSearch = true;
    this.setSearchedIds(selectedSearch.elementIds);
    this.activeTab = 'new';
  }

  protected async onDeletePreviousSearch(selectedSearch: ElementSearchHistoryModel): Promise<void> {
    await AppDatabase.instance.elementsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

  protected onSearchOptionChange(option: SearchByOptionEnum): void {
    this.searchBy = option;
    this.searchValue = '';
    if (option !== SearchByOptionEnum.ID_NAME) {
      this.setSearchedIds([]);
    }
  }

  protected setSearchedIds(searchedIds: number[]): void {
    this.searchedIds = searchedIds;
  }

  protected onSearchInput(newSearchValue: string): void {
    // Using set timeout to improve typing UX of the search especially for devices like tablets and phones
    setTimeout(() => {
      this.searchValue = newSearchValue.toLowerCase();
    }, 0);
  }

  protected onSelectionOptionClick(option: SelectionOptionTypeEnum): void {
    this.selectionOption = { value: option };
  }

  protected onOkClick(): void {
    this.searchName = this.searchName.trim();
    if (this.saveSearch && this.searchName && this.searchedIds.length > 0) {
      AppDatabase.instance.elementsSearchHistory.put({ name: this.searchName, elementIds: this.searchedIds });
    }
    this.searchedIdsChange.emit(this.searchedIds);
  }

}
