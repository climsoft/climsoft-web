import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { ContextualQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/contextual-qc-test-params.model';
import { FlatLineQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/flat-line-qc-test-params.model';
import { RangeThresholdQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-params.model';
import { RelationalQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/relational-qc-test-params.model';
import { RepeatedValueQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/repeated-value-qc-test-params.model';
import { SpikeQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/spike-qc-test-params.model';
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { ViewElementQCTestModel } from 'src/app/core/models/elements/qc-tests/view-element-qc-test.model';
import { ElementsQCTestsService } from 'src/app/metadata/elements/services/elements-qc-tests.service';
import { PeriodsUtil } from 'src/app/shared/controls/period-input/period-single-input/Periods.util';
import { StringUtils } from 'src/app/shared/utils/string.utils';

interface ViewQCTest extends ViewElementQCTestModel {
  formattedQCTestTypeName: string,
  formattedParameters: string;
  formattedObsPeriod: string;
}

@Component({
  selector: 'app-qc-tests',
  templateUrl: './qc-tests.component.html',
  styleUrls: ['./qc-tests.component.scss']
})
export class QCTestsComponent implements OnChanges, OnDestroy {
  @Input()
  public elementId!: number;

  protected qcTests!: ViewQCTest[];

  private destroy$ = new Subject<void>();

  constructor(private qcTestsService: ElementsQCTestsService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.elementId) {
      this.loaQCTests();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loaQCTests(): void {
    this.qcTestsService.findQCTestByElement(this.elementId).pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.qcTests = data.map(item => {
        //console.log(item);
        let formattedParameters: string = '';
        switch (item.qcTestType) {
          case QCTestTypeEnum.RANGE_THRESHOLD:
            const rangeParams = item.parameters as RangeThresholdQCTestParamsModel;
            formattedParameters = `{ Lower threshold : ${rangeParams.lowerThreshold} } { Upper threshold : ${rangeParams.upperThreshold} }`;
            break;
          case QCTestTypeEnum.REPEATED_VALUE:
            const repeatedValueParams = item.parameters as RepeatedValueQCTestParamsModel;
            let excludeStr = '';
            if (repeatedValueParams.excludeRange) {
              const excludeRange = repeatedValueParams.excludeRange;
              excludeStr = `{ Exclude range: { Lower threshold: ${excludeRange.lowerThreshold} } { Upper threshold: ${excludeRange.upperThreshold} } } `
            }
            formattedParameters = `{ Consecutive records : ${repeatedValueParams.consecutiveRecords} } ${excludeStr}`;
            break;
          case QCTestTypeEnum.FLAT_LINE:
            const flatLineParams = item.parameters as FlatLineQCTestParamsModel;
            formattedParameters = `{ Consecutive records : ${flatLineParams.consecutiveRecords} } { Range threshold : ${flatLineParams.rangeThreshold} }`;
            break;
          case QCTestTypeEnum.SPIKE:
            const spikeParams = item.parameters as SpikeQCTestParamsModel;
            formattedParameters = `{ Consecutive records : ${spikeParams.consecutiveRecords} } { Spike threshold : ${spikeParams.spikeThreshold} }`;
            break;
          case QCTestTypeEnum.RELATIONAL_COMPARISON:
            const relationalParams = item.parameters as RelationalQCTestParamsModel;
            formattedParameters = `{ Reference Element : ${relationalParams.referenceElementId} } { Condition : ${relationalParams.condition} }`;
            break;
          case QCTestTypeEnum.DIURNAL:
            break;
          case QCTestTypeEnum.CONTEXTUAL_CONSISTENCY:
            const contextualParams = item.parameters as ContextualQCTestParamsModel;
            formattedParameters = `{ Reference Element : ${contextualParams.referenceElementId} } { Reference check : {condition: ${contextualParams.referenceCheck.condition} value: ${contextualParams.referenceCheck.value} }  }  { Reference check : {condition: ${contextualParams.primaryCheck.condition} value: ${contextualParams.primaryCheck.value} }  } `;
            break;
          default:
            throw new Error("Developer error. QC test type not supported.")
        }


        const obsPeriodName = PeriodsUtil.findPeriod(item.observationPeriod)?.name.toLowerCase();
        const formattedObsPeriod = obsPeriodName ? obsPeriodName : item.observationPeriod.toString()

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
