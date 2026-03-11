import { Component } from '@angular/core';
import { QCTestCacheModel } from 'src/app/metadata/qc-tests/services/qc-specifications-cache.service';
import { QCTestTypeEnum } from 'src/app/metadata/qc-tests/models/qc-test-type.enum';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-qc-fail-detail-dialog',
  templateUrl: './qc-fail-detail-dialog.component.html',
  styleUrls: ['./qc-fail-detail-dialog.component.scss']
})
export class QCFailDetailDialogComponent {

  protected open = false;
  protected testName: string = '';
  protected testType: string = '';
  protected context: any = null;
  protected hasContext = false;
  protected referenceElementName: string = '';
  protected elementName: string = '';

  // Expose enum for template
  protected readonly QCTestType = QCTestTypeEnum;

  constructor(private cachedMetadataService: CachedMetadataService) { }

  public showDialog(
    qcTest: QCTestCacheModel,
    logItem: { qcTestId: number; qcStatus: string; context?: any }
  ): void {
    this.testName = qcTest.name;
    this.testType = logItem.context?.testType ?? qcTest.qcTestType;
    this.context = logItem.context ?? null;
    this.hasContext = !!this.context;

    // Resolve element names for display
    this.elementName = '';
    this.referenceElementName = '';

    if (this.hasContext) {
      // Resolve the primary element name from the QC test spec
      const element = this.cachedMetadataService.getElement(qcTest.elementId);
      this.elementName = element ? element.name : `Element ${qcTest.elementId}`;

      // Resolve reference element name for relational/contextual tests
      const refElementId = this.context.specification?.referenceElementId;
      if (refElementId) {
        const refElement = this.cachedMetadataService.getElement(refElementId);
        this.referenceElementName = refElement ? refElement.name : `Element ${refElementId}`;
      }
    }

    this.open = true;
  }

}
