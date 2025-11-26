import { Component, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AppDatabase } from 'src/app/app-database';
import { ElementSearchHistoryModel } from '../models/elements-search-history.model';
import { ElementCacheModel } from '../services/elements-cache.service';
import { CachedMetadataService } from '../../metadata-updates/cached-metadata.service';

enum SelectionOptionTypeEnum {
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

  @Output() public searchedIdsChange = new EventEmitter<number[]>();

  protected open: boolean = false;
  protected activeTab!: 'new' | 'history';
  protected previousSearches!: ElementSearchHistoryModel[];
  protected searchValue: string = '';
  protected selectionOptionTypeEnum: typeof SelectionOptionTypeEnum = SelectionOptionTypeEnum;
  protected searchName: string = '';
  protected saveSearch: boolean = false;

  // Holds the complete list of elements to search from
  protected elements!: ElementCacheModel[];

  // Holds the filtered list of elements based on filter and search input
  protected filteredElements!: ElementSearchModel[];

  // Holds the ids of the selected elements and is emitted on dialog OK click
  protected selectedIds: number[] = [];

  constructor(private cachedMetadataService: CachedMetadataService) {
  }

  public async showDialog(newSelectedIds?: number[], newIncludeOnlyIds?: number[]): Promise<void> {
    this.searchValue = ''; // clear ay search value
    this.elements = newIncludeOnlyIds && newIncludeOnlyIds.length > 0 ?
      this.cachedMetadataService.elementsMetadata.filter(item => newIncludeOnlyIds.includes(item.id)) :
      this.cachedMetadataService.elementsMetadata;

    if (newSelectedIds && newSelectedIds.length > 0) {
      this.activeTab = 'new';
      this.filteredElements = this.getFilteredElements(this.elements, newSelectedIds);
      this.selectedIds = this.getSelectedElementIds(this.filteredElements);

      this.scrollToTop();
    } else if (this.activeTab === 'history') {
      this.loadSearchHistory();
    } else {
      // If it's the first time the dialog is being shown then load history 
      // and if not previous searches then just show new tab
      await this.loadSearchHistory();
      if (this.previousSearches.length === 0) {
        this.activeTab = 'new';
        this.filteredElements = this.getFilteredElements(this.elements,);
        this.selectedIds = this.getSelectedElementIds(this.filteredElements);
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
    this.filteredElements = this.getFilteredElements(this.elements);
    this.selectedIds = this.getSelectedElementIds(this.filteredElements);
    this.activeTab = selectedTab;
    if (this.activeTab === 'history') this.loadSearchHistory();
  }

  private async loadSearchHistory(): Promise<void> {
    this.previousSearches = await AppDatabase.instance.elementsSearchHistory.toArray();
  }

  protected onPreviousSearchSelected(selectedSearch: ElementSearchHistoryModel): void {
    if (this.searchName === selectedSearch.name) {
      // If same selection then remove selection
      this.searchName = '';
      this.filteredElements = this.getFilteredElements(this.elements);
    } else {
      this.searchName = selectedSearch.name;
      this.filteredElements = this.getFilteredElements(this.elements, selectedSearch.elementIds);
    }
    this.selectedIds = this.getSelectedElementIds(this.filteredElements);
  }

  protected onEditPreviousSearch(selectedSearch: ElementSearchHistoryModel): void {
    this.searchName = selectedSearch.name;
    this.saveSearch = true;
    this.filteredElements = this.getFilteredElements(this.elements, selectedSearch.elementIds);
    this.selectedIds = this.getSelectedElementIds(this.filteredElements);
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
      const newFilterElements = this.getFilteredElements(this.elements, this.selectedIds).filter(item => (
        item.element.id.toString().includes(searchValue) ||
        item.element.abbreviation.toLowerCase().includes(searchValue) ||
        item.element.name.toLowerCase().includes(searchValue)
      ));

      if (isNaN(Number(searchValue))) {
        // For string inputs use element abbreviation and name to sort 
        newFilterElements.sort((a, b) => (
          a.element.abbreviation.localeCompare(b.element.abbreviation) || a.element.name.localeCompare(b.element.name)
        ));
      } else {
        // For number inputs use element id to sort
        const numSearchValue = Number(newSearchValue);
        newFilterElements.sort((a, b) => {
          if (a.element.id === numSearchValue) {
            return -1;
          }
          return 1;
        });
      }

      // Important. Don't set the selected ids here because nothing has been selected.
      this.filteredElements = newFilterElements;

      this.scrollToTop();
    }, 0);
  }

  protected onSelectionOptionClick(option: SelectionOptionTypeEnum): void {
    const newFilteredOptions = this.getFilteredElements(this.elements, this.selectedIds);

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
        newFilteredOptions.sort((a, b) => a.element.id - b.element.id);
        break;
      case SelectionOptionTypeEnum.SORT_BY_NAME:
        newFilteredOptions.sort((a, b) => a.element.name.localeCompare(b.element.name));
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

    this.filteredElements = newFilteredOptions;
    this.selectedIds = this.getSelectedElementIds(this.filteredElements);

    this.scrollToTop();
  }

  protected onSelectedClick(stationSelection: ElementSearchModel): void {
    stationSelection.selected = !stationSelection.selected;
    const index = this.selectedIds.indexOf(stationSelection.element.id);

    if (stationSelection.selected && index === -1) {
      // If selected and not already in the selected list then add it
      this.selectedIds.push(stationSelection.element.id);
    } else if (!stationSelection.selected && index > -1) {
      // If deselected and is in the selected list then remove it
      this.selectedIds.splice(index, 1);
    }
  }

  protected onEnterKeyPress(): void {
    this.onSelectedClick(this.filteredElements[0]);
  }

  /**
   * Gets the filtered elements and sorts them based on selected Ids
   * @param elements 
   * @param selectedIds 
   * @returns 
   */
  private getFilteredElements(elements: ElementCacheModel[], selectedIds?: number[]): ElementSearchModel[] {

    // TODO. In future this function will use domain and sub-domain for filtering the elements.

    let newFilteredElements: ElementSearchModel[];

    if (selectedIds && selectedIds.length > 0) {
      newFilteredElements = [];
      for (const element of elements) {
        newFilteredElements.push({ element: element, selected: selectedIds.includes(element.id) });
      }

      //----------------------------------------------------------------
      // Sort filtered options to have the selectedIds as first items in the filtered options array
      //----------------------------------------------------------------
      // Create a map for quick lookups of the desired order.
      const orderMap = new Map(selectedIds.map((idValue, index) => [idValue, index]));
      newFilteredElements.sort((a, b) => {
        const aInSelected = orderMap.has(a.element.id);
        const bInSelected = orderMap.has(b.element.id);

        // If both are in selectedIds, sort by their order in selectedIds
        if (aInSelected && bInSelected) {
          return orderMap.get(a.element.id)! - orderMap.get(b.element.id)!;
        }
        if (aInSelected) return -1; // a comes first
        if (bInSelected) return 1;  // b comes first 
        return 0; // Keep original order for unselected items
      });
    } else {
      newFilteredElements = elements.map(item => {
        return { element: item, selected: false };
      });
    }

    return newFilteredElements;
  }

  private getSelectedElementIds(filteredElements: ElementSearchModel[]): number[] {
    const newSelectedIds: number[] = [];
    for (const selection of filteredElements) {
      if (selection.selected) {
        newSelectedIds.push(selection.element.id);
      }
    }

    return newSelectedIds;
  }

  protected onDragDrop(event: CdkDragDrop<ElementSearchModel[]>): void {
    //console.log('Drop event:', event);
    moveItemInArray(this.filteredElements, event.previousIndex, event.currentIndex);
    // Note. the template disables drag and drop when no search value is entered. So the filtered elements are all valid posible selections.
    this.selectedIds = this.getSelectedElementIds(this.filteredElements);
  }

  protected onOkClick(): void {
    this.searchName = this.searchName.trim();
    if (this.saveSearch && this.searchName && this.selectedIds.length > 0) {
      AppDatabase.instance.elementsSearchHistory.put({ name: this.searchName, elementIds: this.selectedIds });
    }
    this.searchedIdsChange.emit(this.selectedIds);
  }

  private scrollToTop(): void {
    // Use setTimeout to scroll after the view has been updated with the sorted list.
    setTimeout(() => {
      if (this.elementIdNameTableContainer && this.elementIdNameTableContainer.nativeElement) {
        this.elementIdNameTableContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

}
