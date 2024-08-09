import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

@Component({
  selector: 'app-import-source-delimeter-detail',
  templateUrl: './import-source-delimeter-detail.component.html',
  styleUrls: ['./import-source-delimeter-detail.component.scss']
})
export class ImportSourceDelimeterDetailComponent {
  @Input()
  public delimiter: ',' | '|' | undefined;

  @Output()
  public delimiterChange = new EventEmitter<',' | '|' | undefined>();

  protected onIncludeDelimters(include: boolean): void {
    this.delimiter = include ? "," : undefined;
  }

  protected displayDelimitersFn(option: string): string {
    return option;
  }

}
