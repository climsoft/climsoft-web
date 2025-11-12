import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs'; 
import { OrganisationsCacheService } from '../../services/organisations-cache.service';
import { ViewOrganisationModel } from '../../models/view-organisation.model';

@Component({
  selector: 'app-organisation-selector-multiple',
  templateUrl: './organisation-selector-multiple.component.html',
  styleUrls: ['./organisation-selector-multiple.component.scss']
})
export class OrganisationSelectorMultipleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public selectedIds: number[] = [];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected organisations: ViewOrganisationModel[] = [];
  protected selectedOrganisations: ViewOrganisationModel[] = [];
  private destroy$ = new Subject<void>();

  constructor(private organisationsService: OrganisationsCacheService) {
    // Get all regions 
    this.organisationsService.cachedOrganisations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.organisations = data;
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
    this.selectedOrganisations = this.selectedIds.length > 0 ? this.organisations.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ViewOrganisationModel): string {
    return `${option.name}`;
  }

  /**
   * Called by the generic multiple selector.
   * @param selectedOptions 
   */
  protected onSelectedOptionsChange(selectedOptions: ViewOrganisationModel[]) {
    this.selectedIds.length = 0; // clear the array
    this.selectedIds.push(...selectedOptions.map(data => data.id));

    // emit the id changes
    this.selectedIdsChange.emit(this.selectedIds);
  }

  
}
