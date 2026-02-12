import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { JobTriggerEnum } from '../../models/job-queue-status.enum';

@Component({
  selector: 'app-job-trigger-selector-single',
  templateUrl: './job-trigger-selector-single.component.html',
  styleUrls: ['./job-trigger-selector-single.component.scss']
})
export class JobTriggerSelectorSingleComponent implements OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: JobTriggerEnum[];
  @Input() public selectedId!: JobTriggerEnum | null;
  @Output() public selectedIdChange = new EventEmitter<JobTriggerEnum | null>();

  protected options!: JobTriggerEnum[];
  protected selectedOption!: JobTriggerEnum | null;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(JobTriggerEnum);
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

  protected optionDisplayFunction(option: JobTriggerEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: JobTriggerEnum | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption);
  }
}
