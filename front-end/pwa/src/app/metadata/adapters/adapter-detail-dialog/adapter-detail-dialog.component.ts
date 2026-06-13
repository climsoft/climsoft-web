import { Component, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { AdaptersService } from '../services/adapters.service';
import { ViewAdapterSpecificationModel } from '../models/view-adapter-specification.model';
import { CreateAdapterSpecificationModel } from '../models/create-adapter-specification.model';
import { UpdateAdapterSpecificationModel } from '../models/update-adapter-specification.model';
import { AdapterLanguageEnum } from '../models/adapter-language.enum';
import { AdapterUploadPreviewResponseModel, FileTreeEntry } from '../models/adapter-upload-preview-response.model';

/**
 * Default entry-point filenames per language, matching the starter templates.
 * Auto-filled when the user selects a language and the entry-point field is
 * empty or still set to a previous language's default.
 */
const DEFAULT_ENTRY_POINTS: Record<AdapterLanguageEnum, string> = {
  [AdapterLanguageEnum.PYTHON]: 'main.py',
  [AdapterLanguageEnum.R]: 'main.R',
  [AdapterLanguageEnum.JAVASCRIPT]: 'index.js',
  [AdapterLanguageEnum.SQL]: 'transform.sql',
};

@Component({
  selector: 'app-adapter-detail-dialog',
  templateUrl: './adapter-detail-dialog.component.html',
  styleUrls: ['./adapter-detail-dialog.component.scss'],
})
export class AdapterDetailDialogComponent implements OnDestroy {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: ConfirmationDialogComponent;
  @Output() public saved = new EventEmitter<void>();

  protected open: boolean = false;
  protected title: 'Edit Adapter' | 'New Adapter' = 'New Adapter';

  protected adapter!: ViewAdapterSpecificationModel;
  protected selectedFileName: string = '';

  // Upload preview state
  protected uploadPreviewLoading: boolean = false;
  protected adapterPreviewResponse!: AdapterUploadPreviewResponseModel;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private adaptersService: AdaptersService,
  ) {
    this.resetPreviewResults();
  }

  public openDialog(adapterId?: number): void {
    this.open = true;
    this.resetPreviewResults();
    this.uploadPreviewLoading = false;

    if (adapterId && adapterId > 0) {
      this.title = 'Edit Adapter';
      this.uploadPreviewLoading = true;
      this.adaptersService.findOne(adapterId).pipe(
        takeUntil(this.destroy$),
      ).subscribe({
        next: (data) => {
          this.uploadPreviewLoading = false;
          this.adapter = data;
          this.initFileTreeFromSavedAdapter(adapterId);
        },
        error: (err) => {
          this.uploadPreviewLoading = false;
          this.pagesDataService.showToast({ title: 'Adapter', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
          this.open = false;
        },
      });
    } else {
      this.title = 'New Adapter';
      this.adapter = {
        id: 0,
        name: '',
        description: '',
        language: AdapterLanguageEnum.SQL,
        entryPoint: DEFAULT_ENTRY_POINTS[AdapterLanguageEnum.SQL],
        scriptDirName: '',
        disabled: false,
        comment: '',
      };
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads the file tree for an already-saved adapter's script directory.
   * Same role as `initPreviewFromSavedFile()` in ImportSourceInputDialogComponent.
   */
  private initFileTreeFromSavedAdapter(adapterId: number): void {
    this.uploadPreviewLoading = true;
    this.adaptersService.getFileTree(adapterId).pipe(
      take(1),
    ).subscribe({
      next: (res: AdapterUploadPreviewResponseModel) => {
        this.uploadPreviewLoading = false;
        this.adapterPreviewResponse = res;
        this.selectedFileName = this.adapter.scriptDirName;
      },
      error: () => {
        // Script directory may no longer exist on disk — silently fall
        // back to "upload a zip" prompt, same as the import wizard does
        // when its saved sample file is missing.
        this.uploadPreviewLoading = false;
        this.selectedFileName = '';
      },
    });
  }

  protected onLanguageSelected(language: AdapterLanguageEnum | null): void {
    if (!language || this.adapter.id > 0) return; // Language should not be changeable for existing adapters
    const previousDefault: string = DEFAULT_ENTRY_POINTS[this.adapter.language];
    this.adapter.language = language;
    // Auto-fill entry point if it's empty or still set to the previous language's default.
    if (!this.adapter.entryPoint || this.adapter.entryPoint === previousDefault) {
      this.adapter.entryPoint = DEFAULT_ENTRY_POINTS[language];
    }
  }

  protected onDownloadSelectedLanguageTemplate(): void {
    window.open(this.adaptersService.getLanguageTemplateDownloadUrl(this.adapter.language), '_blank');
  }

  /**
   * When the user picks a zip file, immediately upload it for preview.
   * The backend extracts it, validates the manifest, and returns the
   * file tree. The dialog shows the tree + manifest status before save.
   */
  protected onScriptZipFileSelected(file: File): void {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      this.pagesDataService.showToast({ title: 'Adapter Specification', message: 'Please select a .zip file', type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (!this.adapter.language) {
      this.pagesDataService.showToast({ title: 'Adapter Specification', message: 'Please select a language first', type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.uploadPreviewLoading = true;

    this.adaptersService.uploadPreview(file, this.adapter.language).pipe(
      take(1),
    ).subscribe({
      next: (res: AdapterUploadPreviewResponseModel) => {
        this.uploadPreviewLoading = false;
        this.adapter.scriptDirName = res.scriptDirName;
        this.adapterPreviewResponse = res;
      },
      error: (err) => {
        this.uploadPreviewLoading = false;
        this.pagesDataService.showToast({ title: 'Upload Error', message: err.error?.message || 'Failed to upload and extract zip', type: ToastEventTypeEnum.ERROR });
        console.error('Script upload error:', err);
      },
    });
  }

  /**
   * Whether the entry point the user typed matches an actual file in the
   * file tree. Returns true if no tree is loaded yet (edit mode with no
   * new upload) — the backend will validate on save in that case.
   */
  protected get entryPointValid(): boolean {
    if (!this.adapterPreviewResponse) return false;
    if (this.adapterPreviewResponse.fileTree.length === 0) return true; // No tree loaded — defer to backend
    if (!this.adapter.entryPoint) return false;
    return this.adapterPreviewResponse.fileTree.some(e => !e.isDirectory && e.path === this.adapter.entryPoint);
  }

  protected fileIsEntryPoint(file: FileTreeEntry): boolean {
    return !file.isDirectory && file.path === this.adapter.entryPoint
  }

  /**
   * Whether the save button should be enabled.
   */
  protected get canSave(): boolean {
    if (!this.adapter.name || !this.adapter.language || !this.adapter.scriptDirName || !this.adapter.entryPoint || !this.adapterPreviewResponse || !this.adapterPreviewResponse.manifestFound || !this.entryPointValid) return false;
    return true;
  }

  protected onSave(): void {
    if (!this.canSave) return;

    if (this.adapter.id) {
      const updateModel: UpdateAdapterSpecificationModel = {
        name: this.adapter.name,
        description: this.adapter.description,
        scriptDirName: this.adapter.scriptDirName,
        entryPoint: this.adapter.entryPoint,
        disabled: this.adapter.disabled,
        comment: this.adapter.comment,
      };
      this.adaptersService.update(this.adapter.id, updateModel).pipe(
        take(1),
      ).subscribe({
        next: () => {
          this.pagesDataService.showToast({ title: 'Adapter', message: `Adapter '${this.adapter.name}' updated`, type: ToastEventTypeEnum.SUCCESS });
          this.open = false;
          this.saved.emit();
        },
        error: (err) => this.handleSaveError(err),
      });
    } else {
      const createModel: CreateAdapterSpecificationModel = {
        name: this.adapter.name,
        description: this.adapter.description,
        language: this.adapter.language,
        scriptDirName: this.adapter.scriptDirName!,
        entryPoint: this.adapter.entryPoint,
        disabled: this.adapter.disabled,
        comment: this.adapter.comment || null,
      };
      this.adaptersService.create(createModel).pipe(
        take(1),
      ).subscribe({
        next: () => {
          this.pagesDataService.showToast({ title: 'Adapter', message: `Adapter '${this.adapter.name}' created`, type: ToastEventTypeEnum.SUCCESS });
          this.open = false;
          this.saved.emit();
        },
        error: (err) => this.handleSaveError(err),
      });
    }
  }

  private handleSaveError(err: any): void {
    const serverMessage = err.error?.message;
    const message = Array.isArray(serverMessage) ? serverMessage.join(', ') : (serverMessage ?? err.message);
    this.pagesDataService.showToast({ title: 'Adapter', message: message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
  }

  protected onDelete(): void {
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    this.adaptersService.delete(this.adapter.id).pipe(
      take(1),
    ).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Adapter Specification', message: 'Adapter deleted', type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.saved.emit();
      },
      error: (err) => {
        console.error(err);
        this.pagesDataService.showToast({ title: 'Adapter Specification', message: err.error?.message || 'Something bad happened', type: ToastEventTypeEnum.ERROR });
      },
    });
  }

  private resetPreviewResults(): void {
    this.adapterPreviewResponse = {
      scriptDirName: '',
      fileTree: [],
      manifestFound: false
    };

  }

}
