import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';  
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-qc-test-type-input',
  templateUrl: './qc-test-type-input.component.html',
  styleUrls: ['./qc-test-type-input.component.scss']
})
export class QCTestTypeInputComponent  implements OnChanges  {
  @Input() 
  public label!: string;
  @Input() 
  public errorMessage!: string;
  @Input() 
  public includeOnlyIds!: QCTestTypeEnum[];
  @Input() 
  public selectedId!: QCTestTypeEnum | null;
  @Output() 
  public selectedIdChange = new EventEmitter<QCTestTypeEnum>();

  protected options!: QCTestTypeEnum[];
  protected selectedOption!: QCTestTypeEnum | null;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(QCTestTypeEnum);;
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

  protected optionDisplayFunction(option: QCTestTypeEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: QCTestTypeEnum | null) {
    if(selectedOption !== null){
      this.selectedOption = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }
  }
}
