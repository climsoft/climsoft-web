import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FileServerProtocolEnum } from '../../models/create-connector-specification.model';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-file-server-protocol-selector-single',
  templateUrl: './file-server-protocol-selector-single.component.html',
  styleUrls: ['./file-server-protocol-selector-single.component.scss']
})
export class FileServerProtocolSelectorSingleComponent implements OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: FileServerProtocolEnum[];
  @Input() public selectedId!: FileServerProtocolEnum;
  @Output() public selectedIdChange = new EventEmitter<FileServerProtocolEnum>();

  protected options!: FileServerProtocolEnum[];
  protected selectedOption!: FileServerProtocolEnum | null;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(FileServerProtocolEnum);
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

  protected optionDisplayFunction(option: FileServerProtocolEnum): string {
    return StringUtils.formatEnumForDisplay(option).toUpperCase();
  }

  protected onSelectedOptionChange(selectedOption: FileServerProtocolEnum | null) {
    if (selectedOption) {
      this.selectedOption = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }

  }
}
