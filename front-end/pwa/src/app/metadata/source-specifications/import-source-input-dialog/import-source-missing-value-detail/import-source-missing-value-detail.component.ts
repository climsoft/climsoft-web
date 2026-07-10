import { Component, EventEmitter, Input, Output } from '@angular/core';

// Inclusion-control rule: this step uses a checkbox because the "off" state means
// literally nothing (don't import missing values). Steps whose "off" state still
// carries sub-config (default value or default id) use a radio instead.
@Component({
  selector: 'app-import-source-missing-value-detail',
  templateUrl: './import-source-missing-value-detail.component.html',
  styleUrls: ['./import-source-missing-value-detail.component.scss']
})
export class ImportSourceMissingValueDetailComponent {
  @Input()
  public allowMissingValue!: boolean;

  @Output()
  public allowMissingValueChange = new EventEmitter<boolean>();

  @Input()
  public sourceMissingValueIndicators!: string;

  @Output()
  public sourceMissingValueIndicatorsChange = new EventEmitter<string>();

  protected onAllowMissingValueChange(value: boolean): void {
    this.allowMissingValue = value;
    this.allowMissingValueChange.emit(value);
  }

  protected onSourceMissingValueIndicatorsChange(value: string): void {
    this.sourceMissingValueIndicators = value;
    this.sourceMissingValueIndicatorsChange.emit(value);
  }

}
