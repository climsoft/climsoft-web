import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ViewOrganisationModel } from '../../models/view-organisation.model';
import { OrganisationsCacheService } from '../../services/organisations-cache.service';

@Component({
  selector: 'app-organisation-selector-single-single',
  templateUrl: './organisation-selector-single.component.html',
  styleUrls: ['./organisation-selector-single.component.scss']
})
export class OrganisationSelectorSingleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number>();

  protected allOrganisations: ViewOrganisationModel[] = [];
  protected organisations!: ViewOrganisationModel[];
  protected selectedOrganisation!: ViewOrganisationModel | null;
  private destroy$ = new Subject<void>();

  constructor(private organisationsCacheService: OrganisationsCacheService) {
    this.organisationsCacheService.cachedOrganisations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allOrganisations = data;
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
    this.organisations = this.allOrganisations;
    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.organisations = this.organisations.filter(item => this.includeOnlyIds.includes(item.id));
    }

    const foundElement = this.organisations.find(data => data.id === this.selectedId);
    this.selectedOrganisation = foundElement ? foundElement : null;
  }

  protected optionDisplayFunction(option: ViewOrganisationModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewOrganisationModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : 0;
    this.selectedIdChange.emit(this.selectedId);
  }

}
