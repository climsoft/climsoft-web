import { Component, Input } from '@angular/core';
import { FlatLineQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/flat-line-qc-test-parameters.model';
import { RepeatedValueQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/repeated-value-qc-test-parameters.model';

@Component({
  selector: 'app-qc-test-flat-line-params',
  templateUrl: './qc-test-flat-line-params.component.html',
  styleUrls: ['./qc-test-flat-line-params.component.scss']
})
export class QCTestFlatLineParamsComponent {
@Input()
public flatLineQCTestParameters!:  FlatLineQCTestParametersModel; 

}
