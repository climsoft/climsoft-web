import { Component, Input } from '@angular/core';
import { RangeThresholdQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/range-qc-test-params.model';

@Component({
  selector: 'app-qc-test-range-threshold-params',
  templateUrl: './qc-test-range-threshold-params.component.html',
  styleUrls: ['./qc-test-range-threshold-params.component.scss']
})
export class QCTestRangeThresholdParamsComponent {
  @Input() public rangeThresholdQCTestParameters!: RangeThresholdQCTestParamsModel;

  protected onStationsSpecificationSelection(option: 'All Stations' | 'Specific Stations') {
    switch (option) {
      case 'All Stations':
        this.rangeThresholdQCTestParameters.stationIds = undefined;
        break;

      case 'Specific Stations':
        this.rangeThresholdQCTestParameters.stationIds = [];
        break;

      default:
        break;
    }

  }

  protected onMonthsSpecificationSelection(option: 'All Months' | 'Per Month') {
    switch (option) {
      case 'All Months':
        this.rangeThresholdQCTestParameters.monthsThresholds = undefined;
        this.rangeThresholdQCTestParameters.allRangeThreshold = { lowerThreshold: 0, upperThreshold: 0 };
        break;
      case 'Per Month':
        this.rangeThresholdQCTestParameters.allRangeThreshold = undefined;
        this.rangeThresholdQCTestParameters.monthsThresholds = Array.from({ length: 12 }, (_, i) => ({
          monthId: i + 1, lowerThreshold: 0, upperThreshold: 0
        }));
        break;
      default:
        break;
    }
  }

  protected getMonthName(monthId: number): string {
    const date = new Date(2025, monthId - 1, 1); // Use a fixed year and day, month is 0-indexed
    return date.toLocaleString('en-us', { month: 'long' });
  }

}
