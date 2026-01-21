import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { take } from 'rxjs';
import { ConnectorSpecificationsService } from '../services/connector-specifications.service';
import { ViewConnectorSpecificationModel } from '../models/view-connector-specification.model';

@Component({
  selector: 'app-connector-specification-selector-single',
  templateUrl: './connector-specification-selector-single.component.html',
  styleUrls: ['./connector-specification-selector-single.component.scss']
})
export class ConnectorSpecificationSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null | undefined;
  @Output() public selectedIdChange = new EventEmitter<number>();

  protected allSpecifications: ViewConnectorSpecificationModel[] = [];
  protected specifications!: ViewConnectorSpecificationModel[];
  protected selectedSpecification!: ViewConnectorSpecificationModel | null;

  constructor(private exportTemplatesService: ConnectorSpecificationsService) {
    this.exportTemplatesService.findAll().pipe(take(1)).subscribe(data => {
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

    const foundElement = this.specifications.find(data => data.id === this.selectedId);
    this.selectedSpecification = foundElement ? foundElement : null;
  }

  protected optionDisplayFunction(option: ViewConnectorSpecificationModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewConnectorSpecificationModel | null) {
    this.selectedId = selectedOption ? selectedOption.id : 0;
    this.selectedIdChange.emit(this.selectedId);
  }
}
