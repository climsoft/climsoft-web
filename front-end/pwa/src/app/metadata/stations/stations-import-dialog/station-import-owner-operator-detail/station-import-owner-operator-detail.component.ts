import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FieldMappingModel } from '../../../models/metadata-import-preview.model';

@Component({
  selector: 'app-station-import-owner-operator-detail',
  templateUrl: './station-import-owner-operator-detail.component.html',
  styleUrls: ['./station-import-owner-operator-detail.component.scss']
})
export class StationImportOwnerOperatorDetailComponent {
  @Input() public owner: FieldMappingModel | undefined;
  @Output() public ownerChange = new EventEmitter<FieldMappingModel | undefined>();

  @Input() public operator: FieldMappingModel | undefined;
  @Output() public operatorChange = new EventEmitter<FieldMappingModel | undefined>();

  // ─── Owner ────────────────────────────────────────────────

  protected get isOwnerIncludes(): boolean {
    return this.owner !== undefined && this.owner.defaultValue === undefined;
  }

  protected get isOwnerNotIncludes(): boolean {
    return this.owner !== undefined && this.owner.defaultValue !== undefined;
  }

  protected onOwnerStatusSelection(selection: string): void {
    if (selection === 'Includes Owner') {
      this.owner = { columnPosition: undefined };
    } else {
      this.owner = { defaultValue: '' };
    }
    this.ownerChange.emit(this.owner);
  }

  protected onOwnerColumnPositionChange(value: number | null): void {
    if (this.owner) {
      this.owner.columnPosition = value ?? undefined;
      this.ownerChange.emit(this.owner);
    }
  }

  protected onOwnerFetchSpecificChange(fetch: boolean): void {
    if (this.owner) {
      this.owner.valueMappings = fetch ? [] : undefined;
      this.ownerChange.emit(this.owner);
    }
  }

  protected onAddOwnerMapping(): void {
    this.owner?.valueMappings?.push({ sourceId: '', databaseId: '' });
  }

  protected onRemoveOwnerMapping(index: number): void {
    this.owner?.valueMappings?.splice(index, 1);
    this.ownerChange.emit(this.owner);
  }

  protected onOwnerDefaultValueChange(value: number): void {
    if (this.owner) {
      this.owner.defaultValue = value.toString();
      this.ownerChange.emit(this.owner);
    }
  }

  // ─── Operator ─────────────────────────────────────────────

  protected get isOperatorIncludes(): boolean {
    return this.operator !== undefined && this.operator.defaultValue === undefined;
  }

  protected get isOperatorNotIncludes(): boolean {
    return this.operator !== undefined && this.operator.defaultValue !== undefined;
  }

  protected onOperatorStatusSelection(selection: string): void {
    if (selection === 'Includes Operator') {
      this.operator = { columnPosition: undefined };
    } else {
      this.operator = { defaultValue: '' };
    }
    this.operatorChange.emit(this.operator);
  }

  protected onOperatorColumnPositionChange(value: number | null): void {
    if (this.operator) {
      this.operator.columnPosition = value ?? undefined;
      this.operatorChange.emit(this.operator);
    }
  }

  protected onOperatorFetchSpecificChange(fetch: boolean): void {
    if (this.operator) {
      this.operator.valueMappings = fetch ? [] : undefined;
      this.operatorChange.emit(this.operator);
    }
  }

  protected onAddOperatorMapping(): void {
    this.operator?.valueMappings?.push({ sourceId: '', databaseId: '' });
  }

  protected onRemoveOperatorMapping(index: number): void {
    this.operator?.valueMappings?.splice(index, 1);
    this.operatorChange.emit(this.operator);
  }

  protected onOperatorDefaultValueChange(value: number): void {
    if (this.operator) {
      this.operator.defaultValue = value.toString();
      this.operatorChange.emit(this.operator);
    }
  }
}
