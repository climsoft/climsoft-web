import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { StringUtils } from '../../../../shared/utils/string.utils';
import { ServerTypeEnum } from '../../models/create-connector-specification.model';

@Component({
  selector: 'app-server-type-selector-single',
  templateUrl: './server-type-selector-single.component.html',
  styleUrls: ['./server-type-selector-single.component.scss']
})
export class ServerTypeSelectorSingleComponent implements OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: ServerTypeEnum[];
  @Input() public selectedId!: ServerTypeEnum;
  @Output() public selectedIdChange = new EventEmitter<ServerTypeEnum>();

  protected options!: ServerTypeEnum[];
  protected selectedOption!: ServerTypeEnum | null;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(ServerTypeEnum);
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

  protected optionDisplayFunction(option: ServerTypeEnum): string {
    return StringUtils.formatEnumForDisplay(option).toUpperCase();
  }

  protected onSelectedOptionChange(selectedOption: ServerTypeEnum | null) {
    if (selectedOption) {
      this.selectedOption = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }

  }
}
