import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { SourceTemplatesCacheService } from '../../services/source-templates-cache.service';
import { ViewSourceModel } from '../../models/view-source.model';

@Component({
  selector: 'app-source-selector-multiple',
  templateUrl: './source-selector-multiple.component.html',
  styleUrls: ['./source-selector-multiple.component.scss']
})
export class SourceSelectorMultipleComponent implements OnChanges {
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

  protected allTemplates: ViewSourceModel[] = [];
  protected templates!: ViewSourceModel[];
  protected selectedTemplates!: ViewSourceModel[];

  private destroy$ = new Subject<void>();

  constructor(private sourcesService: SourceTemplatesCacheService) {
    this.sourcesService.cachedSources.pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.allTemplates = data;
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
    this.templates = this.allTemplates;
    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.templates = this.allTemplates.filter(item => this.includeOnlyIds.includes(item.id));
    }
    this.selectedTemplates = this.selectedIds && this.selectedIds.length > 0 ? this.templates.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ViewSourceModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionsChange(selectedOptions: ViewSourceModel[]) {
    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
