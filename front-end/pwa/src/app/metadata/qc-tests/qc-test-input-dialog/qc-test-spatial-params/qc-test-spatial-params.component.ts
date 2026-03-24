import { Component, Input } from '@angular/core';
import { SpatialQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/spatial-qc-test-params.model';

@Component({
  selector: 'app-qc-test-spatial-params',
  templateUrl: './qc-test-spatial-params.component.html',
  styleUrls: ['./qc-test-spatial-params.component.scss']
})
export class QCTestSpatialParamsComponent {
  @Input()
  public spatialQCTestParameters!: SpatialQCTestParamsModel;
}
