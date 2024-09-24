import { Component, Input } from '@angular/core';
import { FlatLineQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/flat-line-qc-test-params.model';

@Component({
  selector: 'app-qc-test-flat-line-params',
  templateUrl: './qc-test-flat-line-params.component.html',
  styleUrls: ['./qc-test-flat-line-params.component.scss']
})
export class QCTestFlatLineParamsComponent {
@Input()
public flatLineQCTestParameters!:  FlatLineQCTestParamsModel; 

}
