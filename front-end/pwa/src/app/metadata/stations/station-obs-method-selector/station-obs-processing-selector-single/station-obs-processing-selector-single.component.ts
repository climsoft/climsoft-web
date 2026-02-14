import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { StationProcessingMethodEnum } from '../../models/station-processing-method.enum';

@Component({
  selector: 'app-station-obs-processing-single-selector',
  templateUrl: './station-obs-processing-selector-single.component.html',
  styleUrls: ['./station-obs-processing-selector-single.component.scss']
})
export class StationObsProcessingSingleSelectorComponent implements OnInit, OnChanges {
  @Input() public label!: string ;
  @Input() public errorMessage!: string ;
  @Input() public includeOnlyIds!: StationProcessingMethodEnum[];
  @Input() public selectedId!: StationProcessingMethodEnum | null;
  @Output() public selectedIdChange = new EventEmitter<StationProcessingMethodEnum | null>();

  protected options!: StationProcessingMethodEnum[];
  protected selectedOption!: StationProcessingMethodEnum | null;

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {


    //load options once
    if (!this.options) {
      this.options = Object.values(StationProcessingMethodEnum);
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = Object.values(StationProcessingMethodEnum).filter(
        data => this.includeOnlyIds.includes(data));
    }

    // Only react to changes if selectedId actually changes and is not the first change
    if (this.selectedId) {
      const found = this.options.find(period => period === this.selectedId);
      if (found && found !== this.selectedOption) {
        //console.log('setting found: ', found)
        this.selectedOption = found;
      }

    }

  }

  protected optionDisplayFunction(option: StationProcessingMethodEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected onSelectedOptionChange(selectedOption: StationProcessingMethodEnum | null) {
    this.selectedOption = selectedOption;
    if (selectedOption) {
      this.selectedId = selectedOption;
      this.selectedIdChange.emit(selectedOption);
    } else {
      this.selectedIdChange.emit(null);
    }

  }
}
