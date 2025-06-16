import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { CreateElementQCTestModel } from 'src/app/core/models/elements/qc-tests/create-element-qc-test.model';
import { ContextualQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/contextual-qc-test-params.model';
import { FlatLineQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/flat-line-qc-test-params.model';
import { QCTestParamConditionEnum } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/qc-test-param-condition.enum';
import { RangeThresholdQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-params.model';
import { RelationalQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/relational-qc-test-params.model';
import { RepeatedValueQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/repeated-value-qc-test-params.model';
import { SpikeQCTestParamsModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/spike-qc-test-params.model';
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { ViewElementQCTestModel } from 'src/app/core/models/elements/qc-tests/view-element-qc-test.model';
import { ElementsQCTestsService } from 'src/app/metadata/elements/services/elements-qc-tests.service';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementCacheModel } from '../../services/elements-cache.service';

@Component({
  selector: 'app-qc-test-input-dialog',
  templateUrl: './qc-test-input-dialog.component.html',
  styleUrls: ['./qc-test-input-dialog.component.scss']
})
export class QCTestInputDialogComponent {
  @Output()
  public ok = new EventEmitter<void>();

  protected displayNotYetSupported: boolean = false;

  protected open: boolean = false;
  protected title: string = '';
  protected updateQcTest!: ViewElementQCTestModel;
  protected errorMessage: string = '';

  constructor(
    private qcTestsService: ElementsQCTestsService,
    private pagesDataService: PagesDataService) { }

  public openDialog(element: ElementCacheModel, updateQcTestModel?: ViewElementQCTestModel): void {
    this.open = true;
    this.title = updateQcTestModel ? "Edit QC Test for " : "New QC Test for ";
    this.title = this.title + element.name;

    if (updateQcTestModel) {
      this.updateQcTest = updateQcTestModel;
      this.qcTestsService.findById(updateQcTestModel.id).pipe(
        take(1)
      ).subscribe((data) => {
        this.updateQcTest = data;
      });
    } else {
      const rangeThreshold: RangeThresholdQCTestParamsModel = { lowerThreshold: 0, upperThreshold: 0, isValid: () => true };
      this.updateQcTest = {
        id: 0,
        name: '',
        description: '',
        elementId: element.id,
        observationLevel: 0,
        observationInterval: 1440,
        qcTestType: QCTestTypeEnum.RANGE_THRESHOLD,
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

  protected onQCTestTypeSelected(qcTestType: QCTestTypeEnum): void {
    if (qcTestType === null) {
      return;
    }

    this.displayNotYetSupported = false;

    switch (qcTestType) {
      case QCTestTypeEnum.RANGE_THRESHOLD:
        const rangeThreshold: RangeThresholdQCTestParamsModel = { lowerThreshold: 0, upperThreshold: 0, isValid: () => true };
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
        const relational: RelationalQCTestParamsModel = { condition: QCTestParamConditionEnum.GREAT_THAN, referenceElementId: 1,  isValid: () => true };
        this.updateQcTest.parameters = relational;
        break;
      case QCTestTypeEnum.DIURNAL:
        this.updateQcTest.parameters = { isValid: () => true }
        this.displayNotYetSupported = true;
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
        this.displayNotYetSupported = true;
        throw new Error('Developer error. QC test not supported.')
    }

    this.updateQcTest.qcTestType = qcTestType;

  }

  protected onOkClick(): void {
    // TODO. Do validations
    this.errorMessage = '';
    if (!this.updateQcTest.name) {
      this.errorMessage = 'Enter name of QC test';
      return;
    }

    const createQCTest: CreateElementQCTestModel = {
      name: this.updateQcTest.name,
      description: this.updateQcTest.description,
      elementId: this.updateQcTest.elementId,
      observationLevel: this.updateQcTest.observationLevel,
      observationInterval: this.updateQcTest.observationInterval,
      qcTestType: this.updateQcTest.qcTestType,
      parameters: this.updateQcTest.parameters,
      disabled: this.updateQcTest.disabled,
      comment: this.updateQcTest.comment
    }

    console.log('test created: ', createQCTest)

    let saveSubscription: Observable<ViewElementQCTestModel>;
    if (this.updateQcTest.id > 0) {
      saveSubscription = this.qcTestsService.update(this.updateQcTest.id, createQCTest);
    } else {
      saveSubscription = this.qcTestsService.add(createQCTest);
    }

    saveSubscription.pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.open = false;
        this.pagesDataService.showToast({ title: "QC Tests", message: this.updateQcTest.id > 0 ? `QC test updated` : `QC test created`, type: ToastEventTypeEnum.SUCCESS });
        this.ok.emit();
      },
      error: err => {
        this.open = false;
        this.pagesDataService.showToast({ title: "QC Tests", message: 'Error in saving qc test', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onDeleteClick(): void {
    this.qcTestsService.delete(this.updateQcTest.id).pipe(
      take(1)
    ).subscribe((data) => {
      let message: string;
      let messageType: ToastEventTypeEnum;
      if (data) {
        message = `qc test deleted`;
        messageType = ToastEventTypeEnum.SUCCESS;
      } else {
        message = "Error in deleting qc test";
        messageType = ToastEventTypeEnum.ERROR;
      }
      this.open = false;
      this.pagesDataService.showToast({ title: "QC Tests", message: message, type: messageType });
      this.ok.emit();
    });
  }

}
