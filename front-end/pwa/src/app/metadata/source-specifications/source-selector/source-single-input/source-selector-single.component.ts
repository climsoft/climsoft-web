import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { ViewSourceModel } from 'src/app/metadata/source-specifications/models/view-source.model';
import { Subject, takeUntil } from 'rxjs';
import { SourceTypeEnum } from '../../models/source-type.enum';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-source-selector-single',
  templateUrl: './source-selector-single.component.html',
  styleUrls: ['./source-selector-single.component.scss']
})
export class SourceSelectorSingleComponent implements OnChanges, OnDestroy {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public includeOnlyType!: SourceTypeEnum;
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewSourceModel[];
  protected selectedOption!: ViewSourceModel | null;
  private destroy$ = new Subject<void>();

  constructor(private cachedMetadataService: CachedMetadataService) {
    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.options = this.cachedMetadataService.sourcesMetadata;
      this.setFilteredOptions();
      this.setInputSelectedOption();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.setFilteredOptions();
    this.setInputSelectedOption();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setFilteredOptions(): void {
    if (!this.options) {
      return;
    }

    if (this.includeOnlyType) {
      this.options = this.options.filter(data => data.sourceType === this.includeOnlyType);
    }

    if (this.includeOnlyIds) {
      this.options = this.options.filter(data => this.includeOnlyIds.includes(data.id));
    }
  }

  private setInputSelectedOption(): void {
    if (!this.options) {
      return;
    }
    
    if (this.selectedId) {
      const found = this.options.find(data => data.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: ViewSourceModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewSourceModel | null) {
    if (selectedOption) {
      //this.selectedId = selectedOption.id;
      this.selectedIdChange.emit(selectedOption.id);
    } else {
      //this.selectedId = null;
      this.selectedIdChange.emit(null);
    }

  }
}
