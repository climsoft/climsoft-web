import { Component, Input } from '@angular/core';
import { take } from 'rxjs';
import { AdaptersService } from '../../services/adapters.service';
import { AdapterTestRunResponseModel } from '../../models/adapter-test-run-response.model';
import { AdapterLanguageEnum } from '../../models/adapter-language.enum';

/**
 * "Test Run" pane inside the adapter detail dialog.
 *
 * Works in two modes:
 *   - **Saved adapter**: uses `POST /adapters/:id/test-run` (needs `adapterId > 0`)
 *   - **Unsaved adapter**: uses `POST /adapters/test-run-preview` (needs
 *     `scriptDirName` + `language` from the upload-preview step)
 *
 * The pane is enabled as soon as the script is uploaded — saving the adapter
 * first is no longer required. The entry point is derived from `language` by
 * the API (canonical convention), so it is not an input here.
 *
 * After a run, the pane lists every file the runner produced (output +
 * runner sidecars) with their sizes. To inspect contents, the user
 * downloads the whole operation directory as a zip.
 */
@Component({
  selector: 'app-adapter-test-run-pane',
  templateUrl: './adapter-test-run-pane.component.html',
  styleUrls: ['./adapter-test-run-pane.component.scss'],
})
export class AdapterTestRunPaneComponent {

  /** Language of the adapter — needed for the preview endpoint. */
  @Input() public language!: AdapterLanguageEnum;

  /** The UUID directory from upload-preview — needed for the preview endpoint. */
  @Input() public scriptDirName: string = '';

  protected pendingSampleFile: File | null = null;
  protected running: boolean = false;
  protected result: AdapterTestRunResponseModel | null = null;
  protected errorMessage: string = '';

  constructor(private readonly adaptersService: AdaptersService) { }

  protected onSampleFileSelected(selectedFile: File): void {
    this.pendingSampleFile = selectedFile;
    this.errorMessage = '';
  }

  protected onDownloadOutput(): void {
    if (!this.result?.operationId) return;
    window.open(this.adaptersService.getTestRunOutputDownloadUrl(this.result.operationId), '_blank');
  }

  protected canRun(): boolean {
    if (this.running || !this.pendingSampleFile) return false;

    return !!this.scriptDirName && !!this.language;
  }

  protected onRunClick(): void {
    if (!this.canRun() || !this.pendingSampleFile) return;
    this.running = true;
    this.result = null;
    this.errorMessage = '';

    const observable = this.adaptersService.testRunPreview(
      this.pendingSampleFile,
      { language: this.language, scriptDirName: this.scriptDirName },
    );

    observable.pipe(take(1)).subscribe({
      next: (res) => {
        this.result = res;
        this.running = false;
      },
      error: (err) => {
        console.error('Test run failed:', err);
        this.running = false;
        const serverMessage = err.error?.message;
        this.errorMessage = Array.isArray(serverMessage) ? serverMessage.join(', ') : (serverMessage ?? err.message);
      },
    });
  }

  protected get statusBadgeClass(): string {
    if (!this.result) return '';
    switch (this.result.status) {
      case 'success': return 'bg-success';
      case 'timeout': return 'bg-warning text-dark';
      case 'failure':
      default: return 'bg-danger';
    }
  }

  protected get statusLabel(): string {
    if (!this.result) return '';
    switch (this.result.status) {
      case 'success': return 'Success';
      case 'timeout': return 'Timeout';
      case 'failure': return 'Failure';
      default: return this.result.status;
    }
  }

  /** Human-readable byte size ("1.2 KB", "356 B", "4.8 MB"). */
  protected formatSize(sizeBytes: number): string {
    if (sizeBytes < 1024) return `${sizeBytes} B`;
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
    if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}
