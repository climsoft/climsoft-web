import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MissingFlagDefinition } from 'src/app/core/models/sources/create-import-source-tabular.model';

@Component({
  selector: 'app-import-source-missing-flag-detail',
  templateUrl: './import-source-missing-flag-detail.component.html',
  styleUrls: ['./import-source-missing-flag-detail.component.scss']
})
export class ImportSourceMissingFlagDetailComponent {
  @Input()
  public missingValueFlagDefinition!: MissingFlagDefinition;

  protected onImportMissingValue(include: boolean): void {
    this.missingValueFlagDefinition.importMissingValue = include;
  }
}
