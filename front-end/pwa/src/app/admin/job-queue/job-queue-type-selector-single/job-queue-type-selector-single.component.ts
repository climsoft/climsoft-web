import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { JobQueueStatusEnum } from '../models/job-queue-status.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-job-queue-type-selector-single',
  templateUrl: './job-queue-type-selector-single.component.html',
  styleUrls: ['./job-queue-type-selector-single.component.scss']
})
export class JobQueueTypeSelectorSingleComponent implements OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: JobQueueStatusEnum[]; // TODO change this to jobqueuetype
  @Input() public selectedId!: JobQueueStatusEnum | null;
  @Output() public selectedIdChange = new EventEmitter<JobQueueStatusEnum | null>();

  protected options!: JobQueueStatusEnum[];
  protected selectedOption!: JobQueueStatusEnum | null;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(JobQueueStatusEnum);
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

  protected optionDisplayFunction(option: JobQueueStatusEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: JobQueueStatusEnum | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption);
  }
}
