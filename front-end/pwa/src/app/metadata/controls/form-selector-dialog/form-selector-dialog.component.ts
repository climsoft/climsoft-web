import { Component, Input, Output, EventEmitter } from '@angular/core';
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
  @Input() okButtonLabel: string = 'Add';
  @Output() ok = new EventEmitter<number[]>();
  open: boolean = false;
  forms!: FormSelection[];
  private selectedIds: number[] = [];// TODO remove
  private exludeIds: number[] = [];

  constructor(private readonly sourcesService: SourcesService) { }

  openDialog(): void {
    this.selectedIds = [];
    this.exludeIds = [];
    this.setupDialog()
  }
  openDialogWithSelectedForms(selectedIds: number[]): void {
    this.selectedIds = selectedIds;
    this.exludeIds = [];
    this.setupDialog();
  }

  openDialogWithExcludedForms(exludeIds: number[]): void {
    this.selectedIds = [];
    this.exludeIds = exludeIds;
    this.setupDialog();
  }

  private setupDialog(): void {
    this.open = true;
    this.sourcesService.getForms().subscribe(data => { 
      this.forms = data
      .filter(form => !this.exludeIds.includes(form.id))
      .map(form => ({ ...form, selected: this.selectedIds.includes(form.id) }));
    });

  }

  protected onFormClicked(form: FormSelection): void {
    // Toggle form selection
    form.selected = !form.selected;

    // Update selectedIds based on the selected forms
    this.selectedIds = this.forms.filter(f => f.selected).map(f => f.id);
  }

  protected onOkClick(): void {
    // Emit the updated selectedIds
    this.ok.emit(this.selectedIds);
  }


}
