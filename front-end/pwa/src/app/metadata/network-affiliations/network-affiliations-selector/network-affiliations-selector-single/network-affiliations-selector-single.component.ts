import { Component,  Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs'; 
import { NetworkAffiliationCacheModel, NetworkAffiliationsCacheService } from '../../services/network-affiliations-cache.service';
 
@Component({
  selector: 'app-network-affiliations-selector-single',
  templateUrl: './network-affiliations-selector-single.component.html',
  styleUrls: ['./network-affiliations-selector-single.component.scss']
})
export class NetworkAffiliationsSelectorSingleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public displayCancelOption!: boolean
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number>();

  protected allNetworks: NetworkAffiliationCacheModel[] = [];
  protected networks!: NetworkAffiliationCacheModel[];
  protected selectedNetwork!: NetworkAffiliationCacheModel | null;
  private destroy$ = new Subject<void>();

  constructor(private elementsCacheSevice: NetworkAffiliationsCacheService) {
    this.elementsCacheSevice.cachedNetworkAffiliations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allNetworks = data;
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
    this.networks = this.allNetworks;
    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.networks = this.networks.filter(item => this.includeOnlyIds.includes(item.id));
    }

    const found = this.networks.find(data => data.id === this.selectedId);
    this.selectedNetwork = found ? found : null;
  }

  protected optionDisplayFunction(option: NetworkAffiliationCacheModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: NetworkAffiliationCacheModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : 0;
    this.selectedIdChange.emit(this.selectedId);
  }
}
