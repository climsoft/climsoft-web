import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter } from '@angular/core';
import { SourceModel } from 'src/app/core/models/source.model';
import { SourcesService } from 'src/app/core/services/sources.service';

export interface FormSelection extends SourceModel {
  selected: boolean;
}

@Component({
  selector: 'app-form-selector-dialog',
  templateUrl: './form-selector-dialog.component.html',
  styleUrls: ['./form-selector-dialog.component.scss']
})
export class FormSelectorDialogComponent {
  @Output() ok = new EventEmitter<number[]>();
  open: boolean = false;
  forms!: FormSelection[];
  private selectedIds: number[] = [];

  constructor(private readonly sourcesService: SourcesService) { }

  openDialog(selectedIds?: number[]): void {
    this.open = true;
    this.sourcesService.getForms().subscribe(data => {
      this.selectedIds = selectedIds ?? [];
      this.forms = data.map(form => ({ ...form, selected: this.selectedIds.includes(form.id) }));
    });
  }

  closeDialog(event: 'OK' | 'CANCEL'): void {
    if (event === 'OK') {
      // Emit the updated selectedIds
      this.ok.emit(this.selectedIds);
    }

  }

  onFormClicked(form: FormSelection): void {
    // Toggle form selection
    form.selected = !form.selected;

    // Update selectedIds based on the selected forms
    this.selectedIds = this.forms.filter(f => f.selected).map(f => f.id);
  }

}
