import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { ContextualQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/contextual-qc-test-params.model';
import { FlatLineQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/flat-line-qc-test-params.model';
import { RangeThresholdQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-params.model';
import { RelationalQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/relational-qc-test-params.model';
import { SpikeQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/spike-qc-test-params.model';
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { ViewElementQCTestModel } from 'src/app/core/models/elements/qc-tests/view-element-qc-test.model';
import { ElementsQCTestsService } from 'src/app/metadata/elements/services/elements-qc-tests.service';
import { IntervalsUtil } from 'src/app/shared/controls/period-input/Intervals.util';
import { StringUtils } from 'src/app/shared/utils/string.utils';
import { ElementCacheModel } from '../../services/elements-cache.service';

interface ViewQCTest extends ViewElementQCTestModel {
  formattedQCTestTypeName: string,
  formattedParameters: string;
  formattedObsInterval: string;
}

@Component({
  selector: 'app-qc-tests',
  templateUrl: './qc-tests.component.html',
  styleUrls: ['./qc-tests.component.scss']
})
export class QCTestsComponent implements OnChanges, OnDestroy {
  @Input()
  public element!: ElementCacheModel;

  protected qcTests!: ViewQCTest[];
  protected userIsSystemAdmin: boolean = false;


  private destroy$ = new Subject<void>();

  constructor(
    private qcTestsService: ElementsQCTestsService,
    private appAuthService: AppAuthService,) {
    this.appAuthService.user.pipe(
      take(1),
    ).subscribe(user => {
      this.userIsSystemAdmin = user && user.isSystemAdmin ? true : false;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.element) {
      this.loaQCTests();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loaQCTests(): void {
    this.qcTestsService.findQCTestByElement(this.element.id).pipe(
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
          case QCTestTypeEnum.FLAT_LINE:
            const flatLineParams = item.parameters as FlatLineQCTestParamsModel;
            let excludeStr = '';
            if (flatLineParams.excludeRange) {
              const excludeRange = flatLineParams.excludeRange;
              excludeStr = `{ Exclude range: { Lower threshold: ${excludeRange.lowerThreshold} } { Upper threshold: ${excludeRange.upperThreshold} } } `
            }
            formattedParameters = `{ Consecutive records : ${flatLineParams.consecutiveRecords} } { Flat Line threshold : ${flatLineParams.flatLineThreshold} } ${excludeStr}`;
            break;
          case QCTestTypeEnum.SPIKE:
            const spikeParams = item.parameters as SpikeQCTestParamsModel;
            formattedParameters = `{ Consecutive records : ${spikeParams.consecutiveRecords} } { Spike threshold : ${spikeParams.spikeThreshold} }`;
            break;
          case QCTestTypeEnum.RELATIONAL_COMPARISON:
            const relationalParams = item.parameters as RelationalQCTestParamsModel;
            formattedParameters = `{ Condition : ${relationalParams.condition} } { Reference Element : ${relationalParams.referenceElementId} }`;
            break;
          case QCTestTypeEnum.DIURNAL:
            break;
          case QCTestTypeEnum.CONTEXTUAL_CONSISTENCY:
            const contextualParams = item.parameters as ContextualQCTestParamsModel;
            formattedParameters = `{ Reference Element : ${contextualParams.referenceElementId} } { Reference check : {condition: ${contextualParams.referenceCheck.condition} value: ${contextualParams.referenceCheck.value} }  }  { Reference check : {condition: ${contextualParams.primaryCheck.condition} value: ${contextualParams.primaryCheck.value} }  } `;
            break;
          default:
            console.log('Developer error. QC test type not supported: ', item)
            throw new Error('Developer error. QC test type not supported.')
        }


        const obsIntervalName: string | undefined = IntervalsUtil.findInterval(item.observationInterval)?.name.toLowerCase();
        const formattedObsInterval: string = obsIntervalName ? obsIntervalName : item.observationInterval.toString();

        const viewQCTest: ViewQCTest = {
          ...item,
          formattedQCTestTypeName: StringUtils.formatEnumForDisplay(item.qcTestType),
          formattedObsInterval: formattedObsInterval,
          formattedParameters: formattedParameters
        }

        return viewQCTest;
      });
    });
  }

  protected onQCTestInput(): void {
    this.loaQCTests();
  }



}
