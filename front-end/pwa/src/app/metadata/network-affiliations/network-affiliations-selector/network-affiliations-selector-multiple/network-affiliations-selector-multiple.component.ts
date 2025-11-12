import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ViewNetworkAffiliationModel } from '../../models/view-network-affiliation.model';
import { NetworkAffiliationsCacheService } from '../../services/network-affiliations-cache.service';

@Component({
  selector: 'app-network-affiliations-selector-multiple',
  templateUrl: './network-affiliations-selector-multiple.component.html',
  styleUrls: ['./network-affiliations-selector-multiple.component.scss']
})
export class NetworkAffiliationsSelectorMultipleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public selectedIds: number[] = [];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected networkAffiliations: ViewNetworkAffiliationModel[] = [];
  protected selectedNetworkAffiliations: ViewNetworkAffiliationModel[] = [];
  private destroy$ = new Subject<void>();

  constructor(private networkAffiliationsService: NetworkAffiliationsCacheService,) {
    this.networkAffiliationsService.cachedNetworkAffiliations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.networkAffiliations = data;
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
    this.selectedNetworkAffiliations = this.selectedIds.length > 0 ? this.networkAffiliations.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ViewNetworkAffiliationModel): string {
    return `${option.name}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: ViewNetworkAffiliationModel[]) {
    this.selectedIds.length = 0; // clear the array
    this.selectedIds.push(...selectedOptions.map(data => data.id));

    // emit the id changes
    this.selectedIdsChange.emit(this.selectedIds);
  }


}
