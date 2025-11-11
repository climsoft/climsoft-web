import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { SelectionOptionTypeEnum } from '../elements-search-dialog.component';
import { ElementCacheModel, ElementsCacheService } from '../../services/elements-cache.service';
import { ViewElementSubdomainModel } from '../../models/view-element-subdomain.model';
import { ViewElementTypeModel } from '../../models/view-element-type.model';

interface SearchModel {
  elementSubDomain: ViewElementSubdomainModel;
  selected: boolean;
}

@Component({
  selector: 'app-element-sub-domain-search',
  templateUrl: './element-sub-domain-search.component.html',
  styleUrls: ['./element-sub-domain-search.component.scss']
})
export class ElementSubdomainsSearchComponent implements OnChanges {
  @ViewChild('elementSubDomainTableContainer') elementSubDomainTableContainer!: ElementRef;

  @Input() public elements!: ElementCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Output() public searchedIdsChange = new EventEmitter<number[]>();

  protected elementSubdomains: SearchModel[] = [];
  protected elementTypes: ViewElementTypeModel[] = [];

  constructor(
    private elementsCacheService: ElementsCacheService
  ) {
    this.loadFocus();
  }

  private async loadFocus() {
    this.elementSubdomains = (await this.elementsCacheService.getElementSubdomains()).map(item => {
      return {
        elementSubDomain: item, selected: false
      }
    });

    this.elementTypes = (await this.elementsCacheService.getElementTypes());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.elementSubdomains.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.elementSubDomain.name.toLowerCase().includes(this.searchValue)) {
          return -1;
        }
        return 1;
      });
      this.scrollToTop();
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
          this.scrollToTop();
          break;
        default:
          break;
      }
    }
  }

  protected onSelected(selection: SearchModel): void {
    selection.selected = !selection.selected;
    this.emitSearchedStationIds();
  }

  private selectAll(select: boolean): void {
    for (const item of this.elementSubdomains) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.elementSubdomains.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private scrollToTop(): void {
    // Use setTimeout to scroll after the view has been updated with the sorted list.
    setTimeout(() => {
      if (this.elementSubDomainTableContainer && this.elementSubDomainTableContainer.nativeElement) {
        this.elementSubDomainTableContainer.nativeElement.scrollTop = 0;
      }
    }, 0);
  }

  private emitSearchedStationIds() {
    const searchedElementIds: number[] = [];
    const selectedElementSubdomains = this.elementSubdomains.filter(item => item.selected).map(i => i.elementSubDomain.id);
    const selectedElementTypes = this.elementTypes.filter(elementType => selectedElementSubdomains.includes(elementType.subdomainId));

    for (const selectedElementTypeId of selectedElementTypes) {
      for (const element of this.elements) {
        if (element.typeId === selectedElementTypeId.id) {
          searchedElementIds.push(element.id);
        }
      }
    }
    this.searchedIdsChange.emit(searchedElementIds);
  }

}
