import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { take } from 'rxjs';
import { ViewExportTemplateModel } from '../../models/view-export-template.model';
import { ExportTemplatesService } from '../../services/export-templates.service';

@Component({
  selector: 'app-export-template-selector-multiple',
  templateUrl: './export-template-selector-multiple.component.html',
  styleUrls: ['./export-template-selector-multiple.component.scss']
})
export class ExportTemplateSelectorMultipleComponent implements OnChanges {
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

  protected allTemplates: ViewExportTemplateModel[] = [];
  protected templates!: ViewExportTemplateModel[];
  protected selectedTemplates!: ViewExportTemplateModel[];

  constructor(private exportTemplatesService: ExportTemplatesService) {
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

  protected optionDisplayFunction(option: ViewExportTemplateModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionsChange(selectedOptions: ViewExportTemplateModel[]) {
    this.selectedIds = selectedOptions.map(data => data.id);
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
