import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { QCStatusEnum } from 'src/app/data-ingestion/models/qc-status.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-qc-status-selector-single',
  templateUrl: './qc-status-selector-single.component.html',
  styleUrls: ['./qc-status-selector-single.component.scss']
})
export class QCStatusSelectorSingleComponent implements OnChanges {
  @Input() public id!: string;
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: QCStatusEnum[];
  @Input() public selectedId!: QCStatusEnum | undefined;
  @Output() public selectedIdChange = new EventEmitter<QCStatusEnum >();

  protected options!: QCStatusEnum[];
  protected selectedOption!: QCStatusEnum | null;

  constructor() {
  }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(QCStatusEnum);;
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

  protected optionDisplayFunction(option: QCStatusEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected onSelectedOptionChange(selectedOption: QCStatusEnum | null) {
   if(selectedOption) this.selectedIdChange.emit(selectedOption );
  }
}
