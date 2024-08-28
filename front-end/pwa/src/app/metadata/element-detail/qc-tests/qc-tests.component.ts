import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { take } from 'rxjs';
import { QCTestsService } from 'src/app/core/services/elements/qc-tests.service';

interface QC {
  qcTypeName: string;
  description: string;
}

@Component({
  selector: 'app-qc-tests',
  templateUrl: './qc-tests.component.html',
  styleUrls: ['./qc-tests.component.scss']
})
export class QCTestsComponent implements OnChanges {
  @Input()
  public elementId!: number;

  protected qcTests!: QC[];

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
        const t: QC = { qcTypeName: item.qcTestType, description: '' };
        return t;
      });
    });
  }

  protected onQCTestInput(): void {
    this.loaQCTests();
  }

  //TODO. Delete later
  protected onClick(qc: QC): void {

  }


}
