import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { StringUtils } from '../../../../shared/utils/string.utils';
import { EndPointTypeEnum } from '../../models/create-connector-specification.model';

@Component({
  selector: 'app-end-point-selector-single',
  templateUrl: './end-point-selector-single.component.html',
  styleUrls: ['./end-point-selector-single.component.scss']
})
export class EndPointSelectorSingleComponent implements OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: EndPointTypeEnum[];
  @Input() public selectedId!: EndPointTypeEnum;
  @Output() public selectedIdChange = new EventEmitter<EndPointTypeEnum>();

  protected options!: EndPointTypeEnum[];
  protected selectedOption!: EndPointTypeEnum | null;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(EndPointTypeEnum);
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = this.options.filter(
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

  protected optionDisplayFunction(option: EndPointTypeEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: EndPointTypeEnum | null) {
    if (selectedOption) {
      this.selectedOption = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }

  }
}
