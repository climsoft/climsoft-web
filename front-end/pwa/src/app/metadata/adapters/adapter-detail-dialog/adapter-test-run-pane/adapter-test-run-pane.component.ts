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
 *     `scriptDirName` + `language` + `entryPoint` from the upload-preview step)
 *
 * The pane is enabled as soon as the script is uploaded and the entry point
 * is set — saving the adapter first is no longer required.
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

  /** The entry point path — needed for the preview endpoint. */
  @Input() public entryPoint: string = '';

  protected pendingSampleFile: File | null = null;
  protected running: boolean = false;
  protected result: AdapterTestRunResponseModel | null = null;
  protected errorMessage: string = '';

  protected stdoutOpen: boolean = true;
  protected stderrOpen: boolean = false;
  protected installOpen: boolean = false;

  constructor(private readonly adaptersService: AdaptersService) { }

  protected onSampleFileSelected(selectedFile: File): void {
    this.pendingSampleFile = selectedFile;
    this.errorMessage = '';
  }

  protected canRun(): boolean {
    if (this.running || !this.pendingSampleFile) return false;

    return !!this.scriptDirName && !!this.language && !!this.entryPoint;
  }

  protected onRunClick(): void {
    if (!this.canRun() || !this.pendingSampleFile) return;
    this.running = true;
    this.result = null;
    this.errorMessage = '';

    const observable = this.adaptersService.testRunPreview(
      this.pendingSampleFile,
      { language: this.language, scriptDirName: this.scriptDirName, entryPoint: this.entryPoint },
    );

    observable.pipe(take(1)).subscribe({
      next: (res) => {
        this.result = res;
        this.running = false;
        this.stderrOpen = res.status !== 'success';
        this.installOpen = res.installLog !== null && res.installLog.trim().length > 0;
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
}
