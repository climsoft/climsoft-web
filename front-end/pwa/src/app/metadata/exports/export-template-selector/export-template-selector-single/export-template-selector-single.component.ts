import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';


import { take } from 'rxjs';
import { ExportTemplatesService } from '../../services/export-templates.service';
import { ViewExportTemplateModel } from '../../models/view-export-template.model';

@Component({
  selector: 'app-export-template-selector-single',
  templateUrl: './export-template-selector-single.component.html',
  styleUrls: ['./export-template-selector-single.component.scss']
})
export class ExportTemplateSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number>();


  protected allTemplates: ViewExportTemplateModel[] = [];
  protected templates!: ViewExportTemplateModel[];
  protected selectedTemplate!: ViewExportTemplateModel | null;

  constructor(private exportTemplatesService: ExportTemplatesService) {
    this.exportTemplatesService.findAll().pipe(take(1)).subscribe(data => {
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
      this.templates = this.templates.filter(item => this.includeOnlyIds.includes(item.id));
    }

    const foundElement = this.templates.find(data => data.id === this.selectedId);
    this.selectedTemplate = foundElement ? foundElement : null;
  }

  protected optionDisplayFunction(option: ViewExportTemplateModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewExportTemplateModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : 0;
    this.selectedIdChange.emit(this.selectedId);
  }
}
