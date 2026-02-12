import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { JobQueueStatusEnum, JobTypeEnum } from '../models/job-queue-status.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-job-type-selector-single',
  templateUrl: './job-type-selector-single.component.html',
  styleUrls: ['./job-type-selector-single.component.scss']
})
export class JobTypeSelectorSingleComponent implements OnChanges {
  @Input() public label!: string;
  @Input() public errorMessage!: string;
  @Input() public includeOnlyIds!: JobTypeEnum[]; // TODO change this to jobqueuetype
  @Input() public selectedId!: JobTypeEnum | null;
  @Output() public selectedIdChange = new EventEmitter<JobTypeEnum | null>();

  protected options!: JobTypeEnum[];
  protected selectedOption!: JobTypeEnum | null;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    //load options once
    if (!this.options) {
      this.options = Object.values(JobTypeEnum);
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = this.options.filter(
        data => this.includeOnlyIds.includes(data));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(item => item === this.selectedId);
      if (found && found !== this.selectedOption) {
        this.selectedOption = found;
      }
    }

  }

  protected optionDisplayFunction(option: JobTypeEnum): string {
    return StringUtils.formatEnumForDisplay(option);
  }

  protected onSelectedOptionChange(selectedOption: JobTypeEnum | null) {
    this.selectedOption = selectedOption;
    this.selectedIdChange.emit(selectedOption);
  }
}
