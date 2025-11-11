import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { ElementCacheModel } from '../../services/elements-cache.service';
import { SelectionOptionTypeEnum } from '../elements-search-dialog.component';

interface ElementSearchModel {
  element: ElementCacheModel;
  selected: boolean;
}

@Component({
  selector: 'app-element-id-name-search',
  templateUrl: './element-id-name-search.component.html',
  styleUrls: ['./element-id-name-search.component.scss']
})
export class elementIDNameSearchComponent implements OnChanges {
  @ViewChild('elementIdNameTableContainer') elementIdNameTableContainer!: ElementRef;

  @Input() public elements!: ElementCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Input() public searchedIds!: number[];
  @Output() public searchedIdsChange = new EventEmitter<number[]>();

  protected selections!: ElementSearchModel[];

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['elements']) {
      this.selections = this.elements.map(item => {
        return { element: item, selected: false };
      });
    }
    if (changes['searchedIds'] && this.searchedIds && this.elements) {
      for (const selection of this.selections) {
        selection.selected = this.searchedIds.includes(selection.element.id);
      }
    }

    if (changes['searchValue'] && this.searchValue) {

      // Make the searched items be the first items
      this.selections.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.element.id.toString().includes(this.searchValue)
          || a.element.name.toLowerCase().includes(this.searchValue)
          || a.element.abbreviation.toLowerCase().includes(this.searchValue)) {
          return -1;
        }
        return 1;
      });

      this.scrollToTop();
    }

    if (changes['selectionOption'] && this.selectionOption) {
      switch (this.selectionOption.value) {
          case SelectionOptionTypeEnum.SORT_SELECTED:
          this.sortBySelected();
          this.scrollToTop(); 
          break;
            case SelectionOptionTypeEnum.SORT_BY_ID:
          this.sortBySelected();
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
  }

  protected onSelected(stationSelection: ElementSearchModel): void {
    stationSelection.selected = !stationSelection.selected;
    this.emitSearchedStationIds();
  }

  private selectAll(select: boolean): void {
    for (const item of this.selections) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.selections.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
    // Create a new array reference to trigger change detection for *ngFor
    this.selections = [...this.selections];
  }


  private scrollToTop(): void {
    // Use setTimeout to scroll after the view has been updated with the sorted list.
    setTimeout(() => {
      if (this.elementIdNameTableContainer && this.elementIdNameTableContainer.nativeElement) {
        this.elementIdNameTableContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

  private emitSearchedStationIds() {
    this.searchedIds.length = 0;
    for (const element of this.selections) {
      if (element.selected) this.searchedIds.push(element.element.id)
    }
    this.searchedIdsChange.emit(this.searchedIds);
  }


}
