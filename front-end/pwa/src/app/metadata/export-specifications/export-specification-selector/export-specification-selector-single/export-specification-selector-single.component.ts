import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { take } from 'rxjs';
import { ExportSpecificationsService } from '../../services/export-specifications.service';
import { ViewExportSpecificationModel } from '../../models/view-export-specification.model';

@Component({
  selector: 'app-export-specification-selector-single',
  templateUrl: './export-specification-selector-single.component.html',
  styleUrls: ['./export-specification-selector-single.component.scss']
})
export class ExportSpecificationSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number>();


  protected allTemplates: ViewExportSpecificationModel[] = [];
  protected templates!: ViewExportSpecificationModel[];
  protected selectedTemplate!: ViewExportSpecificationModel | null;

  constructor(private exportTemplatesService: ExportSpecificationsService) {
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

  protected optionDisplayFunction(option: ViewExportSpecificationModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewExportSpecificationModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : 0;
    this.selectedIdChange.emit(this.selectedId);
  }
}
