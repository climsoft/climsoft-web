import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommentDefinition } from '../../models/import-source-tabular-params.model';

// Inclusion-control rule: this step uses a checkbox because the "off" state means
// literally nothing (no comment column). Steps whose "off" state still carries
// sub-config (default value or default id) use a radio instead.
@Component({
  selector: 'app-import-source-comment-detail',
  templateUrl: './import-source-comment-detail.component.html',
  styleUrls: ['./import-source-comment-detail.component.scss']
})
export class ImportSourceCommentDetailComponent {

  @Input() public commentDefinition: CommentDefinition | undefined;
  @Output() public commentDefinitionChange = new EventEmitter<CommentDefinition | undefined>();

  protected onIncludeComment(include: boolean): void {
    this.commentDefinition = include ? { columnPosition: 0 } : undefined;
    this.commentDefinitionChange.emit(this.commentDefinition);
  }
}
