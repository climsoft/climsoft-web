import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ViewElementTypeModel } from 'src/app/metadata/elements/models/view-element-type.model';
import { ElementsCacheService } from '../../services/elements-cache.service';
import { StringUtils } from 'src/app/shared/utils/string.utils';


interface ElementTypeView {
  elementTypeModel: ViewElementTypeModel;
  elementDomainName: string;
  elementSubdomainName: string;
}

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

  protected options!: ElementTypeView[];
  protected selectedOption!: ElementTypeView | null;

  constructor(
    private elementService: ElementsCacheService,
  ) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load the elements once
    if (!this.options || (this.includeOnlyIds && this.includeOnlyIds.length > 0)) {
      // this.elementTypeservice.getElementTypes(this.includeOnlyIds).subscribe(data => {
      //   this.options = data;
      //   this.setInputSelectedOption();
      // });
      this.setElementTypes();
    } else {
      this.setInputSelectedOption();
    }

  }


  private async setElementTypes(): Promise<void> {
    const elementTypeView: ElementTypeView[] = []
    const elementSubdomains = await this.elementService.getElementSubdomains();
    const elementTypes = await this.elementService.getElementTypes();

    for (const elementType of elementTypes) {
      const subDomain = elementSubdomains.find(item => item.id === elementType.subdomainId);

      if (!subDomain) {
        // TODO. throw error
        continue;
      }     

      elementTypeView.push({
        elementTypeModel: elementType,
        elementDomainName: StringUtils.formatEnumForDisplay(subDomain.domain),
        elementSubdomainName: subDomain.name, 
      });
      
    }

    this.options = elementTypeView;

    this.setInputSelectedOption();

  }

  private setInputSelectedOption(): void {
    if (this.options && this.selectedId) {
      const found = this.options.find(data => data.elementTypeModel.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }
  }

  protected optionDisplayFunction(option: ElementTypeView): string {
    // TODO. Include the domain and subdomain name for display to distinguish them.
    return `${option.elementDomainName} -  ${option.elementSubdomainName} - ${option.elementTypeModel.name}`;
  }

  protected onSelectedOptionChange(selectedOption: ElementTypeView | null) {
    this.selectedIdChange.emit(selectedOption ? selectedOption.elementTypeModel.id : null);
  }

}
