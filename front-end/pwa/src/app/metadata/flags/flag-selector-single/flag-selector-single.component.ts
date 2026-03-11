import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ViewFlagModel } from 'src/app/metadata/flags/models/view-flag.model';
import { FlagsCacheService } from '../services/flags-cache.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-flag-selector-single',
  templateUrl: './flag-selector-single.component.html',
  styleUrls: ['./flag-selector-single.component.scss']
})
export class FlagSelectorSingleComponent implements OnChanges, OnDestroy {
  @Input() public label: string = '';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options: ViewFlagModel[] = [];
  protected selectedOption!: ViewFlagModel | null;

  private destroy$ = new Subject<void>();

  constructor(private flagsCacheService: FlagsCacheService) {

    this.flagsCacheService.cachedFlags.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.options = [...data];
      this.setElementsToInclude();
      this.setSelected();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['includeOnlyIds']) {
      this.setElementsToInclude();
    }
    if (changes['selectedId']) {
      this.setSelected();
    }

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setElementsToInclude(): void {
    this.options = this.includeOnlyIds && this.includeOnlyIds.length > 0 ? this.options.filter(item => this.includeOnlyIds.includes(item.id)) : [...this.options];
  }

  private setSelected(): void {
    if (this.selectedId) {
      const found = this.options.find(data => data.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: ViewFlagModel): string {
    return `${option.abbreviation} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewFlagModel | null) {
    this.selectedIdChange.emit(selectedOption === null ? null : selectedOption.id);
  }
}
