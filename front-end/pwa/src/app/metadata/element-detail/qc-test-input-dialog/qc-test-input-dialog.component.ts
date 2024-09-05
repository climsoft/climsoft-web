import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { CreateQCTestModel } from 'src/app/core/models/elements/qc-tests/create-qc-test.model';
import { ContextualQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/contextual-qc-test-params.model';
import { FlatLineQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/flat-line-qc-test-params.model';
import { QCTestParamConditionEnum } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/qc-test-param-condition.enum';
import { RangeThresholdQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-params.model';
import { RelationalQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/relational-qc-test-params.model';
import { RepeatedValueQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/repeated-value-qc-test-params.model';
import { SpikeQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/spike-qc-test-params.model';
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { UpdateQCTestModel } from 'src/app/core/models/elements/qc-tests/update-qc-test.model';
import { ElementsService } from 'src/app/core/services/elements/elements.service';
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
    private elementsService: ElementsService,
    private pagesDataService: PagesDataService) { }

  public openDialog(elementId: number, updateQcTestModel?: UpdateQCTestModel): void {
    this.open = true;

    // Set the element name
    this.elementsService.findOne(elementId).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.title = updateQcTestModel ? "Edit QC Test for " : "New QC Test for ";
        this.title = this.title + data.name;
      }
    });

    if (updateQcTestModel) {
      this.updateQcTest = updateQcTestModel;
      this.qcTestsService.findOne(updateQcTestModel.id).pipe(
        take(1)
      ).subscribe((data) => {
        this.updateQcTest = data;
      });
    } else {
      const rangeThreshold: RangeThresholdQCTestParamsModel = { lowerLimit: 0, upperLimit: 0, isValid: () => true };
      this.updateQcTest = {
        id: 0,
        qcTestType: QCTestTypeEnum.RANGE_THRESHOLD,
        elementId: elementId,
        observationPeriod: 1440,
        parameters: rangeThreshold,
        disabled: false,
        comment: null
      };
    }
  }

  protected get isRangeThreshold(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.RANGE_THRESHOLD;
  }

  protected get rangeThresholdParam(): RangeThresholdQCTestParamsModel {
    return this.updateQcTest.parameters as RangeThresholdQCTestParamsModel;
  }

  protected get isRepeatedValue(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.REPEATED_VALUE;
  }

  protected get rangerepeatedValueParam(): RepeatedValueQCTestParamsModel {
    return this.updateQcTest.parameters as RepeatedValueQCTestParamsModel;
  }

  protected get isSpike(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.SPIKE;
  }

  protected get spikeParam(): SpikeQCTestParamsModel {
    return this.updateQcTest.parameters as SpikeQCTestParamsModel;
  }

  protected get isFlatLine(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.FLAT_LINE;
  }

  protected get flatLineParam(): FlatLineQCTestParamsModel {
    return this.updateQcTest.parameters as FlatLineQCTestParamsModel;
  }

  protected get isRelationalComparison(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.RELATIONAL_COMPARISON;
  }

  protected get relationalComparisonParam(): RelationalQCTestParamsModel {
    return this.updateQcTest.parameters as RelationalQCTestParamsModel;
  }

  protected get isContextualConsistenty(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.CONTEXTUAL_CONSISTENCY;
  }

  protected get contextualConsistentyParam(): ContextualQCTestParamsModel {
    return this.updateQcTest.parameters as ContextualQCTestParamsModel;
  }

  protected onQCTestTypeSelected(qcTestType: QCTestTypeEnum | null): void {
    if (qcTestType === null) {
      return;
    }

    switch (qcTestType) {
      case QCTestTypeEnum.RANGE_THRESHOLD:
        const rangeThreshold: RangeThresholdQCTestParamsModel = { lowerLimit: 0, upperLimit: 0, isValid: () => true };
        this.updateQcTest.parameters = rangeThreshold;
        break;
      case QCTestTypeEnum.REPEATED_VALUE:
        const repeatedValue: RepeatedValueQCTestParamsModel = { consecutiveRecords: 2, isValid: () => true };
        this.updateQcTest.parameters = repeatedValue;
        break;
      case QCTestTypeEnum.FLAT_LINE:
        const flatLine: FlatLineQCTestParamsModel = { consecutiveRecords: 2, rangeThreshold: 0.5, isValid: () => true };
        this.updateQcTest.parameters = flatLine;
        break;
      case QCTestTypeEnum.SPIKE:
        const spike: SpikeQCTestParamsModel = { consecutiveRecords: 2, spikeThreshold: 0, isValid: () => true };
        this.updateQcTest.parameters = spike;
        break;
      case QCTestTypeEnum.RELATIONAL_COMPARISON:
        const relational: RelationalQCTestParamsModel = { referenceElementId: 1, condition: QCTestParamConditionEnum.GREAT_THAN, isValid: () => true };
        this.updateQcTest.parameters = relational;
        break;
      case QCTestTypeEnum.DIURNAL:
        this.updateQcTest.parameters = { isValid: () => true }
        //TODO.
        break;
      case QCTestTypeEnum.CONTEXTUAL_CONSISTENCY:
        const contextual: ContextualQCTestParamsModel = {
          referenceElementId: 1,
          referenceCheck: { condition: QCTestParamConditionEnum.GREAT_THAN, value: 0 },
          primaryCheck: { condition: QCTestParamConditionEnum.GREAT_THAN, value: 0 },
          isValid: () => true
        };
        this.updateQcTest.parameters = contextual;
        break;
      default:
        throw new Error('Developer error. QC test not supported.')
    }

    this.updateQcTest.qcTestType = qcTestType;

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
        message = this.updateQcTest.id > 0 ? `QC test updated` : `QC test created`;
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
