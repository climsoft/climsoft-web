import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { StationObservationMethodEnum } from 'src/app/core/models/enums/station-observation-method.enum';
import { StringUtils } from 'src/app/shared/utils/string.utils';

@Component({
  selector: 'app-station-obs-method-single-input',
  templateUrl: './station-obs-method-single-input.component.html',
  styleUrls: ['./station-obs-method-single-input.component.scss']
})
export class StationObsMethodSingleInputComponent implements OnInit, OnChanges {
  @Input() public label: string = 'Observation Method';
  @Input() public errorMessage: string = '';
  @Input() public includeOnlyIds!: StationObservationMethodEnum[];
  @Input() public selectedId!: StationObservationMethodEnum | null;
  @Output() public selectedIdChange = new EventEmitter<StationObservationMethodEnum | null>();

  protected options!: StationObservationMethodEnum[];
  protected selectedOption!: StationObservationMethodEnum | null;

  constructor() {

  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {


    //load options once
    if (!this.options) {
      this.options = Object.values(StationObservationMethodEnum);;
    }

    if (this.includeOnlyIds && this.includeOnlyIds.length > 0) {
      this.options = Object.values(StationObservationMethodEnum).filter(
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

  protected optionDisplayFunction(option: StationObservationMethodEnum): string {
    return StringUtils.capitalizeFirstLetter(option);
  }

  protected onSelectedOptionChange(selectedOption: StationObservationMethodEnum | null) {
    if (selectedOption) {
      this.selectedIdChange.emit(selectedOption);
    } else {
      this.selectedIdChange.emit(null);
    }

  }
}
