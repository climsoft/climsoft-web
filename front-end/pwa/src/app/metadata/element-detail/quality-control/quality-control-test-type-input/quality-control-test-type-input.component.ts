import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { QualityControlTestTypeEnum } from 'src/app/core/models/elements/quality-controls/quality-control-test-type.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-quality-control-test-type-input',
  templateUrl: './quality-control-test-type-input.component.html',
  styleUrls: ['./quality-control-test-type-input.component.scss']
})
export class QualityControlTestTypeInputComponent  implements OnChanges  {
  @Input() 
  public label: string = 'QC Test Type';
  @Input() 
  public errorMessage!: string;
  @Input() 
  public includeOnlyIds!: QualityControlTestTypeEnum[];
  @Input() 
  public selectedId!: QualityControlTestTypeEnum | null;
  @Output() 
  public selectedIdChange = new EventEmitter<QualityControlTestTypeEnum | null>();

  protected options!: QualityControlTestTypeEnum[];
  protected selectedOption!: QualityControlTestTypeEnum | null;

  constructor() { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(QualityControlTestTypeEnum);;
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

  protected optionDisplayFunction(option: QualityControlTestTypeEnum): string {
    let wordToDsiplay: string;
    const splitWords: string[] = option.split('_');
    if (splitWords.length > 1) {
      wordToDsiplay = splitWords.map(word => // Capitalise the first letter of each word
       ( word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() )
      ).join(' ');
    } else {
      wordToDsiplay = StringUtils.capitalizeFirstLetter(option) ;
    }
    return wordToDsiplay;
  }

  protected onSelectedOptionChange(selectedOption: QualityControlTestTypeEnum | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption ? selectedOption : null);

  }
}
