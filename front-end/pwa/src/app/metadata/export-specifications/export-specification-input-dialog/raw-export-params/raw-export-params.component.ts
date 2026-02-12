import { Component, Input } from '@angular/core';
import { RawExportParametersModel } from '../../models/raw-export-parameters.model';

@Component({
  selector: 'app-raw-export-params',
  templateUrl: './raw-export-params.component.html',
  styleUrls: ['./raw-export-params.component.scss']
})
export class RawExportParamsComponent {
  @Input() public rawExportParameters!: RawExportParametersModel;

  protected disableStackedDataOptions: boolean = false;

  ngOnInit(): void {
    this.disableStackedDataOptions = this.rawExportParameters.unstackData ? true : false;
  }

  protected onUnstackData(value: boolean): void {
    this.rawExportParameters.unstackData = value;
    this.disableStackedDataOptions = value;

    if (value) {
      this.rawExportParameters.includeFlag = false;
      this.rawExportParameters.includeQCStatus = false;
      this.rawExportParameters.includeQCTestLog = false;
      this.rawExportParameters.includeComments = false;
      this.rawExportParameters.includeEntryDatetime = false;
      this.rawExportParameters.includeEntryUserEmail = false;
    }
  }
}
