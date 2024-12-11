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
  public selectedIds!: number[];
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
      this.filterBasedOnSelectedIds();
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filterBasedOnSelectedIds();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private filterBasedOnSelectedIds(): void {
    this.elements = this.allElements;
    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.elements = this.allElements.filter(item => this.includeOnlyIds.includes(item.id));
    }
    this.selectedElements = this.selectedIds && this.selectedIds.length > 0 ? this.elements.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ElementCacheModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionsChange(selectedOptions: ElementCacheModel[]) {
    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }

  protected onAdvancedSearchInput(selectedIds: number[]): void {
    this.selectedIds = selectedIds;
    this.filterBasedOnSelectedIds();
  }
}
