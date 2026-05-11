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

  protected allSpecifications: ViewExportSpecificationModel[] = [];
  protected specifications!: ViewExportSpecificationModel[];
  protected selectedSpecification!: ViewExportSpecificationModel | null;

  constructor(private exportSpecificationService: ExportSpecificationsService) {
    this.exportSpecificationService.findAll().pipe(take(1)).subscribe(data => {
      this.allSpecifications = data;
      this.filterBasedOnSelectedIds();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.filterBasedOnSelectedIds();
  }

  private filterBasedOnSelectedIds(): void {
    this.specifications = this.allSpecifications;
    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.specifications = this.specifications.filter(item => this.includeOnlyIds.includes(item.id));
    }

    const foundSpec = this.specifications.find(data => data.id === this.selectedId);
    this.selectedSpecification = foundSpec ? foundSpec : null;
  }

  protected optionDisplayFunction(option: ViewExportSpecificationModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewExportSpecificationModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : 0;
    this.selectedIdChange.emit(this.selectedId);
  }
}
