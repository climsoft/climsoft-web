import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs'; 
import { ViewSourceModel } from '../../models/view-source.model';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-source-selector-multiple',
  templateUrl: './source-selector-multiple.component.html',
  styleUrls: ['./source-selector-multiple.component.scss']
})
export class SourceSelectorMultipleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedIds!: number[];
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected templates!: ViewSourceModel[];
  protected selectedTemplates!: ViewSourceModel[];
  private allMetadataLoaded: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(private cachedMetadataService: CachedMetadataService) {
    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.allMetadataLoaded = allMetadataLoaded;
      this.filterBasedOnSelectedIds();
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
    if (!this.allMetadataLoaded) return;

    this.templates = this.includeOnlyIds && this.includeOnlyIds.length > 0 ?
      this.cachedMetadataService.sourcesMetadata.filter(item => this.includeOnlyIds.includes(item.id)) :
      this.cachedMetadataService.sourcesMetadata;

    this.selectedTemplates = this.selectedIds && this.selectedIds.length > 0 ? this.templates.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ViewSourceModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionsChange(selectedOptions: ViewSourceModel[]) {
    this.selectedIds.length = 0;
    this.selectedIds.push(...selectedOptions.map(data => data.id));
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
