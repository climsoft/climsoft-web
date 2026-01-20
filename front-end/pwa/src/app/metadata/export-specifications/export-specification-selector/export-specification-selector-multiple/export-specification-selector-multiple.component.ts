import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { take } from 'rxjs';
import { ViewExportSpecificationModel } from '../../models/view-export-specification.model';
import { ExportSpecificationsService } from '../../services/export-templates.service';

@Component({
  selector: 'app-export-specification-selector-multiple',
  templateUrl: './export-specification-selector-multiple.component.html',
  styleUrls: ['./export-specification-selector-multiple.component.scss']
})
export class ExportSpecificationSelectorMultipleComponent implements OnChanges {
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

  protected allTemplates: ViewExportSpecificationModel[] = [];
  protected templates!: ViewExportSpecificationModel[];
  protected selectedTemplates!: ViewExportSpecificationModel[];

  constructor(private exportTemplatesService: ExportSpecificationsService) {
    this.exportTemplatesService.findAll().pipe(
      take(1),
    ).subscribe(data => {
      this.allTemplates = data;
      this.filterBasedOnSelectedIds();
    });

  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filterBasedOnSelectedIds();
  }

  private filterBasedOnSelectedIds(): void {
    this.templates = this.allTemplates;
    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.templates = this.allTemplates.filter(item => this.includeOnlyIds.includes(item.id));
    }
    this.selectedTemplates = this.selectedIds && this.selectedIds.length > 0 ? this.templates.filter(item => this.selectedIds.includes(item.id)) : [];
  }

  protected optionDisplayFunction(option: ViewExportSpecificationModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionsChange(selectedOptions: ViewExportSpecificationModel[]) {
    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
