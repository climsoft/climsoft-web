import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { CreateQCTestModel } from 'src/app/core/models/elements/qc-tests/create-qc-test.model';
import { ContextualQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/contextual-qc-test-parameters.model';
import { FlatLineQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/flat-line-qc-test-parameters.model';
import { QCTestParamConditionEnum } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/qc-test-parameter-condition.enum';
import { RangeThresholdQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-parameters.model';
import { RelationalQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/relational-qc-test-parameters.model';
import { RepeatedValueQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/repeated-value-qc-test-parameters.model';
import { SpikeQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/spike-qc-test-parameters.model';
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { UpdateQCTestModel } from 'src/app/core/models/elements/qc-tests/update-qc-test.model';
import { QCTestsService } from 'src/app/core/services/elements/qc-tests.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';

@Component({
  selector: 'app-qc-test-input-dialog',
  templateUrl: './qc-test-input-dialog.component.html',
  styleUrls: ['./qc-test-input-dialog.component.scss']
})
export class QCTestInputDialogComponent {
  @Output()
  public ok = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: string = "";
  protected updateQcTest!: UpdateQCTestModel;

  constructor(
    private qcTestsService: QCTestsService,
    private pagesDataService: PagesDataService) { }

  public openDialog(elementId: number, updateQcTestModel?: UpdateQCTestModel): void {
    this.open = true;

    if (updateQcTestModel) {
      this.updateQcTest = updateQcTestModel;
      this.title = "Edit QC Test";
      this.qcTestsService.findOne(updateQcTestModel.id).pipe(
        take(1)
      ).subscribe((data) => {
        this.updateQcTest = data;
      });
    } else {
      this.title = "New QC Test";
      const rangeThreshold: RangeThresholdQCTestParametersModel = { lowerLimit: 0, upperLimit: 0, isValid: () => true };
      this.updateQcTest = {
        id: 0,
        qcTestType: QCTestTypeEnum.RANGE_THRESHOLD,
        elementId: elementId,
        observationPeriod: null,
        parameters: rangeThreshold,
        disabled: false,
        comment: null
      };
    }
  }

  protected get isRangeThreshold(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.RANGE_THRESHOLD;
  }

  protected get rangeThresholdParam(): RangeThresholdQCTestParametersModel {
    return this.updateQcTest.parameters as RangeThresholdQCTestParametersModel;
  }

  protected get isRepeatedValue(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.REPEATED_VALUE;
  }

  protected get rangerepeatedValueParam(): RepeatedValueQCTestParametersModel {
    return this.updateQcTest.parameters as RepeatedValueQCTestParametersModel;
  }

  protected get isSpike(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.SPIKE;
  }

  protected get spikeParam(): SpikeQCTestParametersModel {
    return this.updateQcTest.parameters as SpikeQCTestParametersModel;
  }

  protected get isFlatLine(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.FLAT_LINE;
  }

  protected get flatLineParam(): FlatLineQCTestParametersModel {
    return this.updateQcTest.parameters as FlatLineQCTestParametersModel;
  }


  protected get isRelationalComparison(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.RELATIONAL_COMPARISON;
  }

  protected get relationalComparisonParam(): RelationalQCTestParametersModel {
    return this.updateQcTest.parameters as RelationalQCTestParametersModel;
  }

  protected get isContextualConsistenty(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.CONTEXTUAL_CONSISTENCY;
  }

  protected get contextualConsistentyParam(): ContextualQCTestParametersModel {
    return this.updateQcTest.parameters as ContextualQCTestParametersModel;
  }

  protected onQCTestTypeSelected(qcTestType: QCTestTypeEnum | null): void {
    if (qcTestType === null) {
      return;
    }

    switch (qcTestType) {
      case QCTestTypeEnum.RANGE_THRESHOLD:
        const rangeThreshold: RangeThresholdQCTestParametersModel = { lowerLimit: 0, upperLimit: 0, isValid: () => true };
        this.updateQcTest.parameters = rangeThreshold;
        break;
      case QCTestTypeEnum.REPEATED_VALUE:
        const repeatedValue: RepeatedValueQCTestParametersModel = { consecutiveRecords: 3, isValid: () => true };
        this.updateQcTest.parameters = repeatedValue;
        break;
      case QCTestTypeEnum.FLAT_LINE:
        const flatLine: FlatLineQCTestParametersModel = { consecutiveRecords: 0, range: 0.5, isValid: () => true };
        this.updateQcTest.parameters = flatLine;
        break;
      case QCTestTypeEnum.SPIKE:
        const spike: SpikeQCTestParametersModel = { consecutiveRecords: 0, difference: 0, isValid: () => true };
        this.updateQcTest.parameters = spike;
        break;
      case QCTestTypeEnum.RELATIONAL_COMPARISON:
        const relational: RelationalQCTestParametersModel = { referenceElementId: 1, condition: QCTestParamConditionEnum.GREAT_THAN, isValid: () => true };
        this.updateQcTest.parameters = relational;
        break;
      case QCTestTypeEnum.CONTEXTUAL_CONSISTENCY:
        //TODO. Left here
        break;
      default:
        throw new Error('Developer error. QC test not supported.')
    }

    this.updateQcTest.qcTestType = qcTestType;

  }

  protected onPeriodState(selection: string): void {
    if (selection === 'All observation periods') {
      this.updateQcTest.observationPeriod = null;
    } else {
      this.updateQcTest.observationPeriod = 1440;
    }

  }


  protected onOkClick(): void {
    // TODO. Do validations

    const createQCTest: CreateQCTestModel = {
      qcTestType: this.updateQcTest.qcTestType,
      elementId: this.updateQcTest.elementId,
      observationPeriod: this.updateQcTest.observationPeriod,
      parameters: this.updateQcTest.parameters,
      disabled: this.updateQcTest.disabled,
      comment: this.updateQcTest.comment
    }

    let saveSubscription: Observable<UpdateQCTestModel>;
    if (this.updateQcTest.id > 0) {
      saveSubscription = this.qcTestsService.update(this.updateQcTest.id, createQCTest);
    } else {
      saveSubscription = this.qcTestsService.create(createQCTest);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe((data) => {
      let message: string;
      let messageType: 'success' | 'error';
      if (data) {
        message = this.updateQcTest.id ? `qc test created` : `qc test updated`;
        messageType = 'success';
      } else {
        message = "Error in saving qc test";
        messageType = 'error';
      }
      this.pagesDataService.showToast({ title: "QC Tests", message: message, type: messageType });
      this.ok.emit();
    });
  }

  protected onDeleteClick(): void {
    this.qcTestsService.delete(this.updateQcTest.id).pipe(
      take(1)
    ).subscribe((data) => {
      let message: string;
      let messageType: 'success' | 'error';
      if (data) {
        message = `qc test deleted`;
        messageType = 'success';
      } else {
        message = "Error in deleting qc test";
        messageType = 'error';
      }
      this.pagesDataService.showToast({ title: "QC Tests", message: message, type: messageType });
      this.ok.emit();
    });
  }

}
