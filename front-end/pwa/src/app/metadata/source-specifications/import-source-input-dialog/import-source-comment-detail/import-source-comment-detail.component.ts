import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-import-source-comment-detail',
  templateUrl: './import-source-comment-detail.component.html',
  styleUrls: ['./import-source-comment-detail.component.scss']
})
export class ImportSourceCommentDetailComponent {

  @Input()
  public commentColumnPosition: number | undefined;

  @Output()
  public commentColumnPositionChange = new EventEmitter<number | undefined>();

  protected onIncludeComment(include: boolean): void {
    this.commentColumnPosition = include ? 0 : undefined;
    this.commentColumnPositionChange.emit(this.commentColumnPosition);
  }

  protected onColumnPositionChange(value: number): void {
    this.commentColumnPosition = value;
    this.commentColumnPositionChange.emit(this.commentColumnPosition);
  }

}
