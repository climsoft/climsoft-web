import { Component, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
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

interface ElementSearchModel {
  element: ElementCacheModel;
  selected: boolean;
}


@Component({
  selector: 'app-elements-search-dialog',
  templateUrl: './elements-search-dialog.component.html',
  styleUrls: ['./elements-search-dialog.component.scss']
})
export class ElementsSearchDialogComponent {
  @ViewChild('elementIdNameTableContainer') elementIdNameTableContainer!: ElementRef;

  @Output()
  public searchedIdsChange = new EventEmitter<number[]>();

  protected open: boolean = false;
  protected activeTab!: 'new' | 'history';
  protected previousSearches!: ElementSearchHistoryModel[];
  protected searchName: string = '';
  protected saveSearch: boolean = false;
  protected searchValue: string = '';
  protected selectionOptionTypeEnum: typeof SelectionOptionTypeEnum = SelectionOptionTypeEnum;

  protected elements!: ElementCacheModel[];
  protected selections!: ElementSearchModel[];
  protected searchedIds: number[] = [];

  constructor(private cachedMetadataService: CachedMetadataService) {
  }

  public async showDialog(selectedIds?: number[], includeOnlyIds?: number[]): Promise<void> {
    this.open = true;
    this.elements = includeOnlyIds && includeOnlyIds.length > 0 ?
      this.cachedMetadataService.elementsMetadata.filter(item => includeOnlyIds.includes(item.id)) :
      this.cachedMetadataService.elementsMetadata;

    if (selectedIds && selectedIds.length > 0) {
      this.activeTab = 'new';
      this.filterBasedOnSelections(selectedIds);
      this.onSelectionOptionClick(SelectionOptionTypeEnum.SORT_SELECTED);
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
    this.previousSearches = await AppDatabase.instance.elementsSearchHistory.toArray();
  }

  protected onPreviousSearchSelected(selectedSearch: ElementSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.filterBasedOnSelections(selectedSearch.elementIds);
  }

  protected onEditPreviousSearch(selectedSearch: ElementSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.saveSearch = true;
    this.filterBasedOnSelections(selectedSearch.elementIds);
    this.activeTab = 'new';
  }

  protected async onDeletePreviousSearch(selectedSearch: ElementSearchHistoryModel): Promise<void> {
    await AppDatabase.instance.elementsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

  protected onSearchInput(newSearchValue: string): void {
    // Using set timeout to improve typing UX of the search especially for devices like tablets and phones
    setTimeout(() => {
      const searchValue = newSearchValue.toLowerCase();

      if (isNaN(Number(searchValue))) {
        // For string inputs use element name and abbreviation to search
        // Make the searched items be the first items
        this.selections.sort((a, b) => {
          // If search is found, move it before `b`, otherwise after
          if (a.element.abbreviation.toLowerCase().includes(searchValue)
            || a.element.name.toLowerCase().includes(searchValue)) {
            return -1;
          }
          return 1;
        });
      } else {
        // For number inputs use element id to search
        const numSearchValue = Number(newSearchValue);
        // If search is found, move it before `b`, otherwise after
        this.selections.sort((a, b) => {
          if (a.element.id === numSearchValue) {
            return -1;
          }
          return 1;
        });
      }

      this.scrollToTop();
    }, 0);
  }

  protected onEnterKeyPress(): void {
    this.selections[0].selected = true;
    this.setSearchedIds();
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
        this.selections.sort((a, b) => a.element.id - b.element.id);
        this.scrollToTop();
        break;
      case SelectionOptionTypeEnum.SORT_BY_NAME:
        this.selections.sort((a, b) => a.element.name.localeCompare(b.element.name));
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
      if (this.elementIdNameTableContainer && this.elementIdNameTableContainer.nativeElement) {
        this.elementIdNameTableContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

  protected onSelected(stationSelection: ElementSearchModel): void {
    stationSelection.selected = !stationSelection.selected;
    this.setSearchedIds();
  }

  private filterBasedOnSelections(selectedIds?: number[]): void {
    this.selections = this.elements.map(item => {
      return { element: item, selected: false };
    });

    if (selectedIds && selectedIds.length > 0) {
      for (const selection of this.selections) {
        selection.selected = selectedIds.includes(selection.element.id);
      }
    }

    this.setSearchedIds();
  }

  private setSearchedIds(): void {
    const newSearchedIds: number[] = [];
    for (const selection of this.selections) {
      if (selection.selected) {
        newSearchedIds.push(selection.element.id);
      }
    }

    this.searchedIds = newSearchedIds;
  }

  protected onOkClick(): void {
    this.searchName = this.searchName.trim();
    if (this.saveSearch && this.searchName && this.searchedIds.length > 0) {
      AppDatabase.instance.elementsSearchHistory.put({ name: this.searchName, elementIds: this.searchedIds });
    }
    this.searchedIdsChange.emit(this.searchedIds);
  }

}
