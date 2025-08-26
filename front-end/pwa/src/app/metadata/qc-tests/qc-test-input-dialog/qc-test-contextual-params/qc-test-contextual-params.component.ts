import { Component, Input } from '@angular/core';
import { ContextualQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/contextual-qc-test-params.model';

@Component({
  selector: 'app-qc-test-contextual-params',
  templateUrl: './qc-test-contextual-params.component.html',
  styleUrls: ['./qc-test-contextual-params.component.scss']
})
export class QCTestContextualParamsComponent {
@Input()
public contextualQCTestParameters!:  ContextualQCTestParamsModel; 
 
}
