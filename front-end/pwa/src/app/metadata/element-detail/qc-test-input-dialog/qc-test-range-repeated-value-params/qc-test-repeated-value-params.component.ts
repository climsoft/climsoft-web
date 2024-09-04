import { Component, Input } from '@angular/core';
import { RepeatedValueQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/repeated-value-qc-test-parameters.model';

@Component({
  selector: 'app-qc-test-repeated-value-params',
  templateUrl: './qc-test-repeated-value-params.component.html',
  styleUrls: ['./qc-test-repeated-value-params.component.scss']
})
export class QCTestRepeatedValueParamsComponent {
@Input()
public repeatedValueQCTestParameters!:  RepeatedValueQCTestParametersModel; 

}
