import { Component, Input } from '@angular/core';
import { RangeThresholdQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/range-qc-test-params.model';

@Component({
  selector: 'app-qc-test-range-threshold-params',
  templateUrl: './qc-test-range-threshold-params.component.html',
  styleUrls: ['./qc-test-range-threshold-params.component.scss']
})
export class QCTestRangeThresholdParamsComponent {
@Input()
public rangeThresholdQCTestParameters!:  RangeThresholdQCTestParamsModel; 

}
