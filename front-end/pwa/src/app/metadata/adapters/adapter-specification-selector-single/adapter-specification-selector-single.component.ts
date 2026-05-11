import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { take } from 'rxjs';
import { ViewAdapterSpecificationModel } from '../models/view-adapter-specification.model';
import { AdaptersService } from '../services/adapters.service';

@Component({
  selector: 'app-adapter-specification-selector-single',
  templateUrl: './adapter-specification-selector-single.component.html',
  styleUrls: ['./adapter-specification-selector-single.component.scss']
})
export class AdapterSpecificationSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public placeholder!: string;
  @Input() public displayCancelOption: boolean = false;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();
  @Output() public selectedItemChange = new EventEmitter<ViewAdapterSpecificationModel | null>();

  protected allSpecifications: ViewAdapterSpecificationModel[] = [];
  protected specifications!: ViewAdapterSpecificationModel[];
  protected selectedSpecification!: ViewAdapterSpecificationModel | null;

  constructor(private adapterSpecificationService: AdaptersService) {
    this.adapterSpecificationService.findAll().pipe(take(1)).subscribe(data => {
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

  protected optionDisplayFunction(option: ViewAdapterSpecificationModel): string {
    return `${option.id} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewAdapterSpecificationModel | null) {
    this.selectedId = selectedOption?.id || null;
    this.selectedIdChange.emit(this.selectedId);
    this.selectedItemChange.emit(selectedOption);
  }
}
