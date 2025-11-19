import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ElementCacheModel } from 'src/app/metadata/elements/services/elements-cache.service';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-element-selector-multiple',
  templateUrl: './element-selector-multiple.component.html',
  styleUrls: ['./element-selector-multiple.component.scss']
})
export class ElementSelectorMultipleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedIds: number[] = [];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected elements!: ElementCacheModel[];
  protected selectedElements!: ElementCacheModel[];
  private allMetadataLoaded: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(private cachedMetadataService: CachedMetadataService) {
    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.allMetadataLoaded = allMetadataLoaded;
      this.setElementsToInclude();
      this.filterBasedOnSelectedIds();
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['includeOnlyIds']) {
      this.setElementsToInclude();
    }

    if (changes['selectedIds']) {
      this.filterBasedOnSelectedIds();
    }

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setElementsToInclude(): void {
    if (!this.allMetadataLoaded) return;

    this.elements = this.includeOnlyIds && this.includeOnlyIds.length > 0 ?
      this.cachedMetadataService.elementsMetadata.filter(item => this.includeOnlyIds.includes(item.id)) :
      this.cachedMetadataService.elementsMetadata;
  }

  private filterBasedOnSelectedIds(): void {
    if (!this.allMetadataLoaded) return;
    const selectedElements: ElementCacheModel[] = [];
    if (this.selectedIds.length > 0) {
      // Note. To reserve the order loop by selected ids array not the elements arrays
      for (const id of this.selectedIds) {
        const foundElement = this.elements.find(item => item.id === id);
        if (foundElement) {
          selectedElements.push(foundElement);
        }
      }
    }

    this.selectedElements = selectedElements;
  }

  protected optionDisplayFunction(option: ElementCacheModel): string {
    return `${option.id} - ${option.abbreviation} - ${option.name}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: ElementCacheModel[]) {
    this.selectedIds.length = 0;
    this.selectedIds.push(...selectedOptions.map(data => data.id));
    this.selectedIdsChange.emit(this.selectedIds);
  }

  /**
   * Raised when advanced search input changes
   * @param newSelectedIds 
   */
  protected onAdvancedSearchInput(newSelectedIds: number[]): void {
    // Get the selected elements based on the new selected Ids
    const newSelectedElements: ElementCacheModel[] = this.elements.filter(element => newSelectedIds.includes(element.id));

    //----------------------------------------------------------------
    // Sort selected elements to have the selectedIds as first items in the filtered options array
    //----------------------------------------------------------------
    // Create a map for quick lookups of the desired order.
    const orderMap = new Map(newSelectedIds.map((idValue, index) => [idValue, index]));
    newSelectedElements.sort((a, b) => {
      const aInSelected = orderMap.has(a.id);
      const bInSelected = orderMap.has(b.id);

      // If both are in selectedIds, sort by their order in selectedIds
      if (aInSelected && bInSelected) {
        return orderMap.get(a.id)! - orderMap.get(b.id)!;
      }
      if (aInSelected) return -1; // a comes first
      if (bInSelected) return 1;  // b comes first 
      return 0;
    });
    //----------------------------------------------------------------


    // Set the new selected elements and Ids
    this.selectedElements = newSelectedElements;
    //this.selectedIds = newSelectedIds;
    this.selectedIds.length = 0;
    this.selectedIds.push(...newSelectedIds);

    // Emit the changes
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
