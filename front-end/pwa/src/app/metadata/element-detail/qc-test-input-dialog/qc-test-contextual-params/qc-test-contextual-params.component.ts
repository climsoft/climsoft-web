import { Component, Input } from '@angular/core';
import { ContextualQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/contextual-qc-test-params.model';

@Component({
  selector: 'app-qc-test-contextual-params',
  templateUrl: './qc-test-contextual-params.component.html',
  styleUrls: ['./qc-test-contextual-params.component.scss']
})
export class QCTestContextualParamsComponent {
@Input()
public contextualQCTestParameters!:  ContextualQCTestParamsModel; 
 
}
