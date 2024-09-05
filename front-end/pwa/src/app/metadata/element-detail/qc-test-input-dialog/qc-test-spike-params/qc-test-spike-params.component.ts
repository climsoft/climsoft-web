import { Component, Input } from '@angular/core';
import { SpikeQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/spike-qc-test-params.model';

@Component({
  selector: 'app-qc-test-spike-params',
  templateUrl: './qc-test-spike-params.component.html',
  styleUrls: ['./qc-test-spike-params.component.scss']
})
export class QCTestSpikeParamsComponent {
@Input()
public spikeQCTestParameters!:  SpikeQCTestParamsModel; 

}
