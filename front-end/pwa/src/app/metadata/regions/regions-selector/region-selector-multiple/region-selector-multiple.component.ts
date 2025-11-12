import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { RegionsCacheService } from '../../services/regions-cache.service';
import { ViewRegionModel } from '../../models/view-region.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-region-selector-multiple',
  templateUrl: './region-selector-multiple.component.html',
  styleUrls: ['./region-selector-multiple.component.scss']
})
export class RegionSelectorMultipleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public selectedIds: number[] = [];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected regions: ViewRegionModel[] = [];
  protected selectedRegions: ViewRegionModel[] = [];
  private destroy$ = new Subject<void>();

  constructor(private regionsService: RegionsCacheService) {
    // Get all regions 
    this.regionsService.cachedRegions.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.regions = data;
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedIds']) {
      this.filterBasedOnSelectedIds();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private filterBasedOnSelectedIds(): void {
    this.selectedRegions = this.selectedIds.length > 0 ? this.regions.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ViewRegionModel): string {
    return `${option.name} - ${StringUtils.formatEnumForDisplay(option.regionType)}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: ViewRegionModel[]) {
    this.selectedIds.length = 0; // clear the array
    this.selectedIds.push(...selectedOptions.map(data => data.id));

    // emit the id changes
    this.selectedIdsChange.emit(this.selectedIds);
  }

  
}
