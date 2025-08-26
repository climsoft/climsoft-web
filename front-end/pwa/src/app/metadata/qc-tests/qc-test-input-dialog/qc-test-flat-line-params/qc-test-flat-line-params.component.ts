import { Component, Input } from '@angular/core';
import { FlatLineQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/flat-line-qc-test-params.model';

@Component({
  selector: 'app-qc-test-flat-line-params',
  templateUrl: './qc-test-flat-line-params.component.html',
  styleUrls: ['./qc-test-flat-line-params.component.scss']
})
export class QCTestFlatLineParamsComponent {
@Input()
public flatLineQCTestParameters!:  FlatLineQCTestParamsModel; 

  public onExcludeRangeSelection(excludeRange: boolean): void {
    this.flatLineQCTestParameters.excludeRange = excludeRange ? { lowerThreshold: 0, upperThreshold: 0 } : undefined;
  }

}
