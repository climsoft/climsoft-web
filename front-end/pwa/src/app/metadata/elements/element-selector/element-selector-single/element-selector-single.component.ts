import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ElementCacheModel, ElementsCacheService } from '../../services/elements-cache.service';

@Component({
  selector: 'app-element-selector-single',
  templateUrl: './element-selector-single.component.html',
  styleUrls: ['./element-selector-single.component.scss']
})
export class ElementSelectorSingleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public displayCancelOption!: boolean
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number>();

  protected allElements: ElementCacheModel[] = [];
  protected elements!: ElementCacheModel[];
  protected selectedElement!: ElementCacheModel | null;
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
      this.elements = this.elements.filter(item => this.includeOnlyIds.includes(item.id));
    }

    const foundElement = this.elements.find(data => data.id === this.selectedId);
    this.selectedElement = foundElement ? foundElement : null;
  }

  protected optionDisplayFunction(option: ElementCacheModel): string {
    return `${option.id} - ${option.abbreviation} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ElementCacheModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : 0;
    this.selectedIdChange.emit(this.selectedId);
  }
}
