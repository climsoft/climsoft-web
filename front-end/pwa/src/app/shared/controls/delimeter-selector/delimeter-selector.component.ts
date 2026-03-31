import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

interface DelimiterOption {
  symbol: string | undefined;
  name: string;
}

const DELIMITER_OPTIONS: DelimiterOption[] = [
  { symbol: undefined, name: 'Auto-detect' },
  { symbol: ',', name: 'Comma' },
  { symbol: '\t', name: 'Tab' },
  { symbol: '|', name: 'Pipe' },
  { symbol: ';', name: 'Semicolon' },
  { symbol: '-', name: 'Hyphen' },
];

@Component({
  selector: 'app-delimeter-selector',
  templateUrl: './delimeter-selector.component.html',
  styleUrls: ['./delimeter-selector.component.scss']
})
export class DelimeterSelectorComponent implements OnChanges {
  @Input() public id: string = 'delimiter';
  @Input() public label: string = 'Delimiter';
  @Input() public delimiter: string | undefined;
  @Output() public delimiterChange = new EventEmitter<string | undefined>();

  protected options: DelimiterOption[] = DELIMITER_OPTIONS;
  protected selectedOption: DelimiterOption | undefined | null = undefined;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['delimiter']) {
      if (this.delimiter) {
        const found = this.options.find(opt => opt.symbol === this.delimiter);
        if (found && found !== this.selectedOption) {
          this.selectedOption = found;
        }
      } else {
        this.selectedOption = undefined;
      }
    }
  }

  protected optionDisplayFunction(option: DelimiterOption): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedOption: DelimiterOption | null): void {
    if (selectedOption) {
      this.delimiter = selectedOption.symbol;
      this.delimiterChange.emit(selectedOption.symbol);
    } else {
      this.delimiter = undefined;
      this.delimiterChange.emit(undefined);
    }
  }
}
