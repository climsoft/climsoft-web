import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { DateUtils } from 'src/app/shared/utils/date.utils';

interface Hour {
  id: number;
  name: string;
}

@Component({
  selector: 'app-hour-single-input',
  templateUrl: './hour-single-input.component.html',
  styleUrls: ['./hour-single-input.component.scss']
})
export class HourSingleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Hour';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: number[];
  @Input() public showNavigationButtons!: boolean;
  @Input() public selectedId!: number | null;
  @Output() public selectedIdChange = new EventEmitter<number | null>();

  protected options!: Hour[];
  protected selectedOption!: Hour | null;

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {

    //load options once
    if (!this.options) {
      this.options = this.getHours();
    }

    if (this.includeOnlyIds) {
      this.options = this.getHours().filter(data => this.includeOnlyIds.includes(data.id));
    }

    if (this.selectedId !== undefined) {
      const found = this.options.find(period => period.id === this.selectedId);
      this.selectedOption = found ? found : null;
    }

  }

  private getHours(): Hour[] {
    return DateUtils.getHours().map(data => ({ id: data['id'], name: data['name'] }));;
  }

  protected optionDisplayFunction(option: Hour): string {
    return option.name;
  }

  protected onSelectedOptionChange(selectedValue: Hour | null) {
    this.selectedOption = selectedValue;
    if (selectedValue) {
      this.selectedId = selectedValue.id;
      this.selectedIdChange.emit(selectedValue.id);
    } else {
      this.selectedId = null;
      this.selectedIdChange.emit(null);
    }
  }

  protected onPrevious(): void {
    if (!this.selectedOption) return;

    const index: number = this.options.findIndex(item => item.id === this.selectedOption?.id);
    if (index > 0) this.onSelectedOptionChange(this.options[index - 1]);
  }

  protected onNext(): void {
    if (!this.selectedOption) return;

    const index: number = this.options.findIndex(item => item.id === this.selectedOption?.id);
    if (index < this.options.length-1 ) this.onSelectedOptionChange(this.options[index + 1]);
  }
}
