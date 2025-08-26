import { Component, EventEmitter, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { CreateQCTestModel } from 'src/app/metadata/qc-tests/models/create-qc-test.model';
import { ContextualQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/contextual-qc-test-params.model';
import { FlatLineQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/flat-line-qc-test-params.model';
import { QCTestParamConditionEnum } from 'src/app/metadata/qc-tests/models/qc-test-parameters/qc-test-param-condition.enum';
import { RangeThresholdQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/range-qc-test-params.model';
import { RelationalQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/relational-qc-test-params.model';
import { SpikeQCTestParamsModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/spike-qc-test-params.model';
import { QCTestTypeEnum } from 'src/app/metadata/qc-tests/models/qc-test-type.enum';
import { ViewQCTestModel } from 'src/app/metadata/qc-tests/models/view-qc-test.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { QCTestsCacheService } from '../services/qc-tests-cache.service';

@Component({
  selector: 'app-qc-test-input-parameter-dialog',
  templateUrl: './qc-test-parameter-input-dialog.component.html',
  styleUrls: ['./qc-test-parameter-input-dialog.component.scss']
})
export class QCTestParameterInputDialogComponent {
  @Output()
  public ok = new EventEmitter<void>();

  protected displayNotYetSupported: boolean = false;

  protected open: boolean = false;
  protected title: string = '';
  protected updateQcTest!: ViewQCTestModel;

  constructor(
    private qcTestscacheService: QCTestsCacheService,
    private pagesDataService: PagesDataService) { }

  public openDialog(elementQCTestId?: number): void {
    this.open = true;
    this.title = elementQCTestId ? 'Edit QC Test' : 'New QC Test';

    if (elementQCTestId) {
      this.qcTestscacheService.findOne(elementQCTestId).pipe(
        take(1)
      ).subscribe((data) => {
        if (!data) throw new Error('QC test not found');
        this.updateQcTest = {
          id: data.id,
          name: data.name,
          description: data.description,
          elementId: data.elementId,
          observationLevel: data.observationLevel,
          observationInterval: data.observationInterval,
          qcTestType: data.qcTestType,
          parameters: data.parameters,
          disabled: data.disabled,
          comment: data.comment
        };
        this.displayNotYetSupported = false;
      });
    } else {
      const rangeThreshold: RangeThresholdQCTestParamsModel = { lowerThreshold: 0, upperThreshold: 0, isValid: () => true };
      this.updateQcTest = {
        id: 0,
        name: '',
        description: '',
        elementId: 0,
        observationLevel: 0,
        observationInterval: 1440,
        qcTestType: QCTestTypeEnum.RANGE_THRESHOLD,
        parameters: rangeThreshold,
        disabled: false,
        comment: null
      };
      this.displayNotYetSupported = false;
    }
  }

  protected get isRangeThreshold(): boolean {
    return this.updateQcTest && this.updateQcTest.qcTestType === QCTestTypeEnum.RANGE_THRESHOLD;
  }

  protected get rangeThresholdParam(): RangeThresholdQCTestParamsModel {
    return this.updateQcTest.parameters as RangeThresholdQCTestParamsModel;
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

    this.displayNotYetSupported = false;

    switch (qcTestType) {
      case QCTestTypeEnum.RANGE_THRESHOLD:
        const rangeThreshold: RangeThresholdQCTestParamsModel = { lowerThreshold: 0, upperThreshold: 0, isValid: () => true };
        this.updateQcTest.parameters = rangeThreshold;
        break;
      case QCTestTypeEnum.FLAT_LINE:
        const flatLine: FlatLineQCTestParamsModel = { consecutiveRecords: 2, flatLineThreshold: 0, isValid: () => true };
        this.updateQcTest.parameters = flatLine;
        break;
      case QCTestTypeEnum.SPIKE:
        const spike: SpikeQCTestParamsModel = { spikeThreshold: 0, isValid: () => true };
        this.updateQcTest.parameters = spike;
        break;
      case QCTestTypeEnum.RELATIONAL_COMPARISON:
        const relational: RelationalQCTestParamsModel = { condition: QCTestParamConditionEnum.GREAT_THAN, referenceElementId: 1, isValid: () => true };
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
    if (!this.updateQcTest.elementId) {
      this.pagesDataService.showToast({ title: "QC Tests", message: 'Element required', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.updateQcTest.name) {
      this.pagesDataService.showToast({ title: "QC Tests", message: 'QC test name required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    const createQCTest: CreateQCTestModel = {
      name: this.updateQcTest.name,
      description: this.updateQcTest.description,
      elementId: this.updateQcTest.elementId,
      observationLevel: this.updateQcTest.observationLevel,
      observationInterval: this.updateQcTest.observationInterval,
      qcTestType: this.updateQcTest.qcTestType,
      parameters: this.updateQcTest.parameters,
      disabled: this.updateQcTest.disabled,
      comment: this.updateQcTest.comment,
    };

    let saveSubscription: Observable<ViewQCTestModel>;
    if (this.updateQcTest.id > 0) {
      saveSubscription = this.qcTestscacheService.update(this.updateQcTest.id, createQCTest);
    } else {
      saveSubscription = this.qcTestscacheService.add(createQCTest);
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
    this.qcTestscacheService.delete(this.updateQcTest.id).pipe(
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
