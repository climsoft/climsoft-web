import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ElementDomainEnum } from 'src/app/core/models/enums/element-domain.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-element-domain-single-input',
  templateUrl: './element-domain-single-input.component.html',
  styleUrls: ['./element-domain-single-input.component.scss']
})
export class ElementDomainSingleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Domain';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: ElementDomainEnum[];
  @Input() public selectedId!: ElementDomainEnum | null;
  @Output() public selectedIdChange = new EventEmitter<ElementDomainEnum | null>();

  protected options!: ElementDomainEnum[];
  protected selectedOption!: ElementDomainEnum | null;

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {


    //load options once
    if (!this.options) {
      this.options = Object.values(ElementDomainEnum);;
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = Object.values(ElementDomainEnum).filter(
        data => this.includeOnlyIds.includes(data));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(period => period === this.selectedId);
      if (found && found !== this.selectedOption) { 
        this.selectedOption = found;
      }

    }

  }

  protected optionDisplayFunction(option: ElementDomainEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected onSelectedOptionChange(selectedOption: ElementDomainEnum | null) {
    this.selectedIdChange.emit(selectedOption ? selectedOption : null);

  }
}
