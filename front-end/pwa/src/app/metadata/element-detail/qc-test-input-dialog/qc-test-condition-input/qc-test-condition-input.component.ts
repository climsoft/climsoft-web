import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { QCTestParamConditionEnum } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/qc-test-parameter-condition.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-qc-test-condition-input',
  templateUrl: './qc-test-condition-input.component.html',
  styleUrls: ['./qc-test-condition-input.component.scss']
})
export class QCTestConditionInputComponent implements OnChanges {
  @Input()
  public label: string = 'Condition';
  @Input()
  public errorMessage!: string;
  @Input()
  public includeOnlyIds!: QCTestParamConditionEnum[];
  @Input()
  public selectedId!: QCTestParamConditionEnum | null;
  @Output()
  public selectedIdChange = new EventEmitter<QCTestParamConditionEnum>();

  protected options!: QCTestParamConditionEnum[];
  protected selectedOption!: QCTestParamConditionEnum | null;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(QCTestParamConditionEnum);;
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

  protected optionDisplayFunction(option: QCTestParamConditionEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: QCTestParamConditionEnum | null) {
    if (selectedOption !== null) {
      this.selectedOption = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    }
  }
}
