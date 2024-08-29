import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { take } from 'rxjs';
import { RangeThresholdQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-parameters.model';
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { UpdateQCTestModel } from 'src/app/core/models/elements/qc-tests/update-qc-test.model';
import { QCTestsService } from 'src/app/core/services/elements/qc-tests.service';
import { PeriodsUtil } from 'src/app/shared/controls/period-input/period-single-input/Periods.util';
import { StringUtils } from 'src/app/shared/utils/string.utils';

interface ViewQCTest extends UpdateQCTestModel {
  formattedQCTestTypeName: string,
  formattedParameters: string;
  formattedObsPeriod: string;
}

@Component({
  selector: 'app-qc-tests',
  templateUrl: './qc-tests.component.html',
  styleUrls: ['./qc-tests.component.scss']
})
export class QCTestsComponent implements OnChanges {
  @Input()
  public elementId!: number;

  protected qcTests!: ViewQCTest[];

  constructor(private qcTestsService: QCTestsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.elementId) {
      this.loaQCTests();
    }
  }

  protected loaQCTests(): void {
    this.qcTestsService.findQCTestByElement(this.elementId).pipe(
      take(1)
    ).subscribe((data) => {
      this.qcTests = data.map(item => {
        //console.log(item);
        let formattedParameters: string = '';
        switch (item.qcTestType) {
          case QCTestTypeEnum.RANGE_THRESHOLD:
            const rangeQCParams = item.parameters as RangeThresholdQCTestParametersModel;
            formattedParameters = `Lower limit = ${rangeQCParams.lowerLimit} and upper limit = ${rangeQCParams.upperLimit}`;
            break;
          case QCTestTypeEnum.FLAT_LINE:
            break;
          case QCTestTypeEnum.SPIKE:
            break;
          case QCTestTypeEnum.REPEATED_VALUE:
            break;
          case QCTestTypeEnum.RELATIONAL_COMPARISON:
            break;
          case QCTestTypeEnum.DIFFERENCE_THRESHOLD:
            break;
          case QCTestTypeEnum.SUMMATION_THRESHOLD:
            break;
          case QCTestTypeEnum.DIURNAL:
            break;
          case QCTestTypeEnum.CONTEXTUAL_CONSISTENCY:
            break;
          default:
            throw new Error("Developer error. QC test type not supported.")
        }


        let formattedObsPeriod: string = 'All';
        if (item.observationPeriod !== null) {
          const obsPeriodName = PeriodsUtil.findPeriod(item.observationPeriod)?.name.toLowerCase();
          formattedObsPeriod = obsPeriodName ? obsPeriodName : item.observationPeriod.toString()
        }

        return {
          ...item,
          formattedQCTestTypeName: StringUtils.formatEnumForDisplay(item.qcTestType),
          formattedObsPeriod: formattedObsPeriod,
          formattedParameters: formattedParameters
        };
      });
    });
  }

  protected onQCTestInput(): void {
    this.loaQCTests();
  }



}
