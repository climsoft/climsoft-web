import { Component, Input } from '@angular/core';
import { RelationalQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/relational-qc-test-params.model';

@Component({
  selector: 'app-qc-test-relational-params',
  templateUrl: './qc-test-relational-params.component.html',
  styleUrls: ['./qc-test-relational-params.component.scss']
})
export class QCTestRelationalParamsComponent {
@Input()
public relationalQCTestParameters!:  RelationalQCTestParamsModel; 
 
}
