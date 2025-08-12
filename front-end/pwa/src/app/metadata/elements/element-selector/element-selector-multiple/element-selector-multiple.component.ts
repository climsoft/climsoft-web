import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ElementCacheModel, ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';

@Component({
  selector: 'app-element-selector-multiple',
  templateUrl: './element-selector-multiple.component.html',
  styleUrls: ['./element-selector-multiple.component.scss']
})
export class ElementSelectorMultipleComponent implements OnChanges, OnDestroy {
  @Input()
  public id!: string;
  @Input()
  public label!: string;
  @Input()
  public placeholder!: string;
  @Input()
  public errorMessage!: string;
  @Input()
  public includeOnlyIds!: number[];
  @Input()
  public selectedIds: number[] = [];
  @Output()
  public selectedIdsChange = new EventEmitter<number[]>();

  protected allElements: ElementCacheModel[] = [];
  protected elements!: ElementCacheModel[];
  protected selectedElements!: ElementCacheModel[];
  private destroy$ = new Subject<void>();

  constructor(private elementsCacheSevice: ElementsCacheService) {
    this.elementsCacheSevice.cachedElements.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allElements = data;
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
    this.elements = this.includeOnlyIds && this.includeOnlyIds.length > 0 ? this.allElements.filter(item => this.includeOnlyIds.includes(item.id)) : this.allElements;
  }

  private filterBasedOnSelectedIds(): void {
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
   * Called from advanced search dialog
   * @param searchedIds 
   */
  protected onAdvancedSearchInput(searchedIds: number[]): void {
    this.selectedIds.length = 0;
    const selectedElements: ElementCacheModel[] = []
    for (const element of this.elements) {
      if (searchedIds.includes(element.id)) {
        this.selectedIds.push(element.id);
        selectedElements.push(element);
      }
    }
    this.selectedElements = selectedElements;
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
