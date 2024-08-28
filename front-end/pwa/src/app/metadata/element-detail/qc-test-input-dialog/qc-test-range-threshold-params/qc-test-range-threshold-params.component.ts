import { Component, Input } from '@angular/core';
import { RangeThresholdQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-parameters.model';

@Component({
  selector: 'app-qc-test-range-threshold-params',
  templateUrl: './qc-test-range-threshold-params.component.html',
  styleUrls: ['./qc-test-range-threshold-params.component.scss']
})
export class QCTestRangeThresholdParamsComponent {
@Input()
public rangeThresholdQCTestParameters!:  RangeThresholdQCTestParametersModel; 

}
