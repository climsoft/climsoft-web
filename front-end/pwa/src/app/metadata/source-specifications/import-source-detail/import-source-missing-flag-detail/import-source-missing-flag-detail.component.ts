import { Component, EventEmitter, Input, Output } from '@angular/core';


@Component({
  selector: 'app-import-source-missing-flag-detail',
  templateUrl: './import-source-missing-flag-detail.component.html',
  styleUrls: ['./import-source-missing-flag-detail.component.scss']
})
export class ImportSourceMissingFlagDetailComponent {
  @Input()
  public allowMissingValue!: boolean;

  @Output()
  public allowMissingValueChange = new EventEmitter<boolean>();

  @Input()
  public sourceMissingValueFlags!: string;

  @Output()
  public sourceMissingValueFlagsChange = new EventEmitter<string>();


}
