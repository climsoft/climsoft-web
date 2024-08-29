import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Observable, take } from 'rxjs';
import { CreateQCTestModel } from 'src/app/core/models/elements/qc-tests/create-qc-test.model';
import { RangeThresholdQCTestParametersModel } from 'src/app/core/models/elements/qc-tests/qc-test-parameters/range-qc-test-parameters.model';
import { QCTestTypeEnum } from 'src/app/core/models/elements/qc-tests/qc-test-type.enum';
import { UpdateQCTestModel } from 'src/app/core/models/elements/qc-tests/update-qc-test.model';
import { QCTestsService } from 'src/app/core/services/elements/qc-tests.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { StationElementsService } from 'src/app/core/services/stations/station-elements.service';

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
      const limitTest: RangeThresholdQCTestParametersModel = { lowerLimit: 0, upperLimit: 0, isValid: () => true };
      this.updateQcTest = {
        id: 0,
        qcTestType: QCTestTypeEnum.RANGE_THRESHOLD,
        elementId: elementId,
        observationPeriod: null,
        parameters: limitTest,
        realTime: true,
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

  protected onQCTestTypeSelected(qcTestTypeId: QCTestTypeEnum | null): void {
    if (qcTestTypeId) {
      this.updateQcTest.qcTestType = qcTestTypeId;
    }
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
      realTime: this.updateQcTest.realTime,
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
