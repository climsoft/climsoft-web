import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateUtils } from 'src/app/shared/utils/date.utils';

interface Hour {
  id: number;
  name: string;
}

@Component({
  selector: 'app-hour-multiple-input',
  templateUrl: './hour-multiple-input.component.html',
  styleUrls: ['./hour-multiple-input.component.scss']
})
export class HourMultipleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Hour';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds: number[] = [];//important to be defined by default
  @Input() public selectedIds: number[] = [];//important to be defined by default
  @Output() public selectedIdsChange = new EventEmitter<number[]>();

  protected options!: Hour[];
  protected selectedOptions: Hour[] = [];

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //incase they are undefined from the parent component, then don't set up control
    if (!this.includeOnlyIds || !this.selectedIds) {
      return;
    }

    //load options once
    if (!this.options) {
      this.options = this.getHours();
    }

    if (this.includeOnlyIds.length > 0) {
      this.options = this.getHours().filter(data => this.includeOnlyIds.includes(data.id));
    }

    if (this.selectedIds.length > 0) {
      this.selectedOptions = this.options.filter(data => this.selectedIds.includes(data.id));
    }

  }

  private getHours(): Hour[] {
    return DateUtils.getHours().map(data => ({ id: data['id'], name: data['name'] }));;
  }

  protected optionDisplayFunction(option: Hour): string {
    return option.name;
  }

  protected onSelectedOptionsChange(selectedOptions: Hour[]) {
    //remove all ids then add new. Important to retain original reference
    this.selectedIds.length = 0;
    for (const option of selectedOptions) {
      this.selectedIds.push(option.id)
    }
    this.selectedIdsChange.emit(this.selectedIds);
  }
}
