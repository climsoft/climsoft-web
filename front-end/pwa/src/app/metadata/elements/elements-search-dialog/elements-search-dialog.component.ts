import { Component, Output, EventEmitter } from '@angular/core';
import { AppDatabase } from 'src/app/app-database';
import { take } from 'rxjs';  
import { ElementSearchHistoryModel } from '../models/elements-search-history.model';
import { ElementCacheModel, ElementsCacheService } from '../services/elements-cache.service';

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

  @Output()
  public searchedIdsChange = new EventEmitter<number[]>();

  protected open: boolean = false;
  protected activeTab: 'new' | 'history' = 'history';
  protected previousSearches!: ElementSearchHistoryModel[];
  protected elementsSelections!: ElementSearchModel[];
  protected searchedIds: number[] = [];
  protected searchName: string = '';
  protected saveSearch: boolean = false;

  constructor(private elementsCacheService: ElementsCacheService) { 
  }

  public openDialog(): void {
    this.loadSearchHistory();
    this.open = true;
  }
 
  private async loadSearchHistory(): Promise<void> {
    this.previousSearches = await AppDatabase.instance.elementsSearchHistory.toArray();
  }

  protected onTabChange(selectedTab: 'new' | 'history'): void {
    this.searchedIds = [];
    this.searchName = '';
    this.saveSearch = false;
    if(selectedTab === 'new'){
      this.loadElementsSelections();
    }
   
    this.activeTab = selectedTab;
   }

  protected onPreviousSearchSelected(selectedSearch: ElementSearchHistoryModel): void {
    this.searchedIds = selectedSearch.elementIds;
    this.searchName = selectedSearch.name;
  }

  protected onEditPreviousSearch(selectedSearch: ElementSearchHistoryModel): void {
    this.onIdsSelected(selectedSearch.elementIds);
    this.onSearchNameInput(selectedSearch.name);
    this.saveSearch = selectedSearch.name ? true : false;

    this.loadElementsSelections();
    this.sortSelectionBySelected();
    this.activeTab = 'new';
  }

  protected async onDeletePreviousSearch(selectedSearch: ElementSearchHistoryModel): Promise<void> {
    await AppDatabase.instance.elementsSearchHistory.delete(selectedSearch.name);
    this.loadSearchHistory();
  }

  private loadElementsSelections(): void {
    this.elementsCacheService.cachedElements.pipe(take(1)).subscribe(elements => {
      this.elementsSelections = elements.map(element => {
        return {
          element: element,
          selected: this.searchedIds.includes(element.id),
        };
      });
    });
  }

  protected onSearchInput(searchValue: string): void {
    // Make the searched items be the first items
    this.elementsSelections.sort((a, b) => {
      // If search is found, move it before `b`, otherwise after
      if (a.element.id.toString() === searchValue 
        || a.element.name.toLowerCase().includes(searchValue)
        || a.element.typeName.toLowerCase().includes(searchValue) ) {
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

  protected onElementSelected(selection: ElementSearchModel): void {
    selection.selected = !selection.selected;
    this.setSearchedIdsFromSelections()
  }

  private selectAll(select: boolean): void {
    for (const item of this.elementsSelections) {
      item.selected = select;
    }

    this.setSearchedIdsFromSelections()
  }

  private sortSelectionBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.elementsSelections.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private setSearchedIdsFromSelections(): void {
    this.onIdsSelected(this.elementsSelections.filter(item => item.selected).map(item => item.element.id));
  }

  private onIdsSelected(searchedIds: number[]): void {
    this.searchedIds = searchedIds;
  }

  protected onSearchNameInput(searchName: string): void {
    this.searchName = searchName;
  }

  protected onOkClick(): void {
    if (this.searchedIds.length > 0 && this.searchName) {
      AppDatabase.instance.elementsSearchHistory.put({ name: this.searchName, elementIds: this.searchedIds });
    }

    this.searchedIdsChange.emit(this.searchedIds);
  }

}
