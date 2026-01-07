import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { StringUtils } from '../../../../shared/utils/string.utils';
import { ConnectorProtocolEnum } from '../../models/connector-protocol.enum';

@Component({
  selector: 'app-connector-protocol-selector-single',
  templateUrl: './connector-protocol-selector-single.component.html',
  styleUrls: ['./connector-protocol-selector-single.component.scss']
})
export class ConnectorProtocolSelectorSingleComponent implements OnChanges {
  @Input() public label: string = 'Server Type';
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: ConnectorProtocolEnum[];
  @Input() public selectedId!: ConnectorProtocolEnum | null;
  @Output() public selectedIdChange = new EventEmitter<ConnectorProtocolEnum | null>();

  protected options!: ConnectorProtocolEnum[];
  protected selectedOption!: ConnectorProtocolEnum | null;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(ConnectorProtocolEnum);
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

  protected optionDisplayFunction(option: ConnectorProtocolEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: ConnectorProtocolEnum | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption ? selectedOption : null);
  }
}
