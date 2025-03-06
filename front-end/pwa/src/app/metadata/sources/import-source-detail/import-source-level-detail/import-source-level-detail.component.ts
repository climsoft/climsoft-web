import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-import-source-level-detail',
  templateUrl: './import-source-level-detail.component.html',
  styleUrls: ['./import-source-level-detail.component.scss']
})
export class ImportSourceLevelDetailComponent {

  @Input()
  public levelColumnPosition: number | undefined;

  @Output()
  public levelColumnPositionChange = new EventEmitter<number | undefined>();

  protected onIncludeElevation(include: boolean): void {
    this.levelColumnPosition = include ? 0 : undefined;
  }

}
