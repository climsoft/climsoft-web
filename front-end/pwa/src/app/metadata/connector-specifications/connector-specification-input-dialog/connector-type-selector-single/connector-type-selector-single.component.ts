import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { StringUtils } from '../../../../shared/utils/string.utils';
import { ConnectorTypeEnum } from '../../models/connector-type.enum';

@Component({
  selector: 'app-connector-type-selector-single',
  templateUrl: './connector-type-selector-single.component.html',
  styleUrls: ['./connector-type-selector-single.component.scss']
})
export class ConnectorTypeSelectorSingleComponent implements OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: ConnectorTypeEnum[];
  @Input() public selectedId!: ConnectorTypeEnum;
  @Output() public selectedIdChange = new EventEmitter<ConnectorTypeEnum>();

  protected options!: ConnectorTypeEnum[];
  protected selectedOption!: ConnectorTypeEnum | null;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(ConnectorTypeEnum);
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

  protected optionDisplayFunction(option: ConnectorTypeEnum): string {
    return StringUtils.formatEnumForDisplay(option).toUpperCase();
  }

  protected onSelectedOptionChange(selectedOption: ConnectorTypeEnum | null) {
    if (selectedOption) {
      this.selectedOption = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }
  }
}
