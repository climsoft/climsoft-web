import { Component, Input, Output, EventEmitter,  OnChanges, SimpleChanges } from '@angular/core';

import { StringUtils } from 'src/app/shared/utils/string.utils'; 
import { ElementDomainEnum } from '../../models/element-domain.enum';
import { ElementCacheModel } from '../../services/elements-cache.service';
import { SelectionOptionTypeEnum } from '../elements-search-dialog.component';

interface SearchModel {
  elementDomain: ElementDomainEnum;
  selected: boolean;
  formattedElementDomain: string;
}

@Component({
  selector: 'app-element-domain-search',
  templateUrl: './element-domain-search.component.html',
  styleUrls: ['./element-domain-search.component.scss']
})
export class ElementDomainSearchComponent implements OnChanges {
  @Input() public elements!: ElementCacheModel[];
  @Input() public searchValue!: string;
  @Input() public selectionOption!: { value: SelectionOptionTypeEnum };
  @Output() public searchedIdsChange = new EventEmitter<number[]>();

  protected elementDomains: SearchModel[] = [];

  constructor(
  ) {
    this.elementDomains = Object.values(ElementDomainEnum).map(item => {
      return {
        elementDomain: item,
        selected: false,
        formattedElementDomain: StringUtils.formatEnumForDisplay(item)
      };
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && this.searchValue) {
      // Make the searched items be the first items
      this.elementDomains.sort((a, b) => {
        // If search is found, move it before `b`, otherwise after
        if (a.formattedElementDomain.toLowerCase().includes(this.searchValue)) {
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

  protected onSelected(selection: SearchModel): void {
    selection.selected = !selection.selected;
    this.emitSearchedStationIds();
  }

  private selectAll(select: boolean): void {
    for (const item of this.elementDomains) {
      item.selected = select;
    }
    this.emitSearchedStationIds();
  }

  private sortBySelected(): void {
    // Sort the array so that items with `selected: true` come first
    this.elementDomains.sort((a, b) => {
      if (a.selected === b.selected) {
        return 0; // If both are the same (either true or false), leave their order unchanged
      }
      return a.selected ? -1 : 1; // If `a.selected` is true, move it before `b`, otherwise after
    });
  }

  private emitSearchedStationIds() {
    const searchedIds: number[] = []
    const selectedStationStatuses = this.elementDomains.filter(item => item.selected);
    for (const selectedStatus of selectedStationStatuses) {
      for (const element of this.elements) {
        if (element.domain === selectedStatus.elementDomain) {
          searchedIds.push(element.id);
        }
      }
    }
    this.searchedIdsChange.emit(searchedIds);
  }



}
