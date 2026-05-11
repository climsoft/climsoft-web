import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { ADAPTER_LANGUAGE_LABELS, AdapterLanguageEnum } from '../../models/adapter-language.enum';

@Component({
  selector: 'app-adapter-language-selector-single',
  templateUrl: './adapter-language-selector-single.component.html',
  styleUrls: ['./adapter-language-selector-single.component.scss']
})
export class AdapterLanguageSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: AdapterLanguageEnum[];
  @Input() public selectedId!: AdapterLanguageEnum | null;
  @Output() public selectedIdChange = new EventEmitter<AdapterLanguageEnum>();

  protected options!: AdapterLanguageEnum[];
  protected selectedOption!: AdapterLanguageEnum | null;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(AdapterLanguageEnum);;
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = this.options.filter(
        data => this.includeOnlyIds.includes(data));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(item => item === this.selectedId);
      if (found && found !== this.selectedOption) {
        //console.log('setting found: ', found)
        this.selectedOption = found;
      }

    }

  }

  protected optionDisplayFunction(option: AdapterLanguageEnum): string {
    return ADAPTER_LANGUAGE_LABELS[option];
  }

  protected onSelectedOptionChange(selectedOption: AdapterLanguageEnum | null) {
    if(selectedOption)  this.selectedIdChange.emit(selectedOption );
  }
}
