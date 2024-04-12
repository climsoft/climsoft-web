import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ViewElementTypeModel } from 'src/app/core/models/view-element-type.model';
import { ElementTypesService } from 'src/app/core/services/element-types.service';
import { ElementsService } from 'src/app/core/services/elements.service';

@Component({
  selector: 'app-element-type-single-input',
  templateUrl: './element-type-single-input.component.html',
  styleUrls: ['./element-type-single-input.component.scss']
})
export class ElementTypeSingleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Type';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: ViewElementTypeModel[];
  protected selectedOption!: ViewElementTypeModel | null;

  constructor(private elementTypeservice: ElementTypesService) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the elements once
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      this.elementTypeservice.getElementTypes(this.includeOnlyIds).subscribe(data => {
        this.options = data;
        this.setInputSelectedOption();
      });
    } else {
      this.setInputSelectedOption();
    }

  }

  private setInputSelectedOption(): void {
    if (this.options && this.selectedId) {
      const found = this.options.find(data => data.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: ViewElementTypeModel): string {
    return `${option.domainName} - ${option.subdomainName} - ${option.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ViewElementTypeModel | null) {
    this.selectedIdChange.emit(selectedOption ? selectedOption.id : null);
  }

}
