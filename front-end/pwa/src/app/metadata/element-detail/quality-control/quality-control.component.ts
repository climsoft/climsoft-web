import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LimitsQCTestParametersModel } from 'src/app/core/models/elements/quality-controls/qc-test-parameters/limits-qc-test-parameters.model';
import { QualityControlTestTypeEnum } from 'src/app/core/models/elements/quality-controls/quality-control-test-type.enum';
import { UpdateQualityControlTestDto } from 'src/app/core/models/elements/quality-controls/update-quality-control-test.model';
import { StationElementsService } from 'src/app/core/services/stations/station-elements.service';

@Component({
  selector: 'app-quality-control',
  templateUrl: './quality-control.component.html',
  styleUrls: ['./quality-control.component.scss']
})
export class QualityControlComponent {
  @Input()
  public title: string = "Set Monthly Limits";

  @Output()
  public ok = new EventEmitter<void>();
  protected open: boolean = false;

  protected updateQcTestModel!: UpdateQualityControlTestDto;
  constructor(private stationElementsService: StationElementsService) { }

  public openDialog(elementId: number, updateQcTestModel?: UpdateQualityControlTestDto): void {
    this.open = true;

    if (updateQcTestModel) {
      this.updateQcTestModel = updateQcTestModel;
    } else {

      const limitTest: LimitsQCTestParametersModel = {
        lowerLimit: 0, upperLimit: 0,
        isValid: () => true
      };

      this.updateQcTestModel = {
        id: 0,
        qcTestTypeId: QualityControlTestTypeEnum.RANGE_THRESHOLD,
        elementId: elementId,
        period: null,
        parameters: limitTest,
        realTime: true,
        disabled: false,
        comment: null
      };
    }




    //this.loadLimits();
  }


  protected onOkCancelClick(): void {
    //this.ok.emit(this.monthLimits);
  }

}
