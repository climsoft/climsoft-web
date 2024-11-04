import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-import-source-elevation-detail',
  templateUrl: './import-source-elevation-detail.component.html',
  styleUrls: ['./import-source-elevation-detail.component.scss']
})
export class ImportSourceElevationDetailComponent {

  @Input()
  public elevationColumnPosition: number | undefined;

  @Output()
  public elevationColumnPositionChange = new EventEmitter<number | undefined>();

  protected onIncludeElevation(include: boolean): void {
    this.elevationColumnPosition = include ? 0 : undefined;
  }

}
