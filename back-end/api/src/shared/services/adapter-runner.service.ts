import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { FileIOService } from './file-io.service';
import { AppConfig } from 'src/app.config';
import { AdapterLanguageEnum } from 'src/metadata/adapters/enums/adapter-language.enum';
import { AdapterWarning } from 'src/metadata/adapters/dtos/adapter-run-result.dto';
import { FileProcessingErrorType, FileProcessingError } from 'src/metadata/file-processing-error.model';

/**
 * Identifying the adapter to run. Uses raw fields rather than an entity
 * object so this service can live in SharedModule without depending on
 * the TypeORM entity (which is registered in MetadataModule).
 *
 * `entryPoint` is intentionally absent — each per-language runner hardcodes
 * its canonical filename (`main.py`, `main.R`, `index.js`, `transform.sql`).
 * The convention is enforced at upload-preview time on the API side.
 */
export interface AdapterRef {
    id: number;
    name: string;
    language: AdapterLanguageEnum;
    scriptDirName: string;
}

/**
 * Context fields written into `metadata.json` for the script to read.
 */
export interface AdapterRunMetadata {
    //originalFileName: string;
    initiatedByUserId: number;
    initiatedAt: string;
    sourceSpecId: number | null;
    sourceSpecName: string | null;
    stationId: string | null;
    utcOffset: number | null;
    specParameters: Record<string, unknown> | null;
    testRun: boolean;
}

export interface AdapterRunResult {
    status: 'success' | 'failure' | 'timeout';
    durationMs: number;
    outputFiles: string[];
    stdout: string;
    stderr: string;
    installLog: string | null;
    warnings: AdapterWarning[];
    error?: FileProcessingError;
}

/**
 * Wire contract with the runner microservices.
 *
 * The runner and the API share the adapters/operations volumes but mount them
 * at potentially different paths (in dev the API runs on the host under
 * `<projectRoot>/back-end/api/temp/…` while the runner sees `/app/…`). The
 * wire therefore carries only IDs and operation-relative paths — each runner
 * hardcodes its own `ADAPTERS_ROOT` / `OPERATIONS_ROOT` and reconstructs full
 * paths locally. Metadata / warnings / stdout / stderr / install-log
 * filenames are pure convention inside the runner's output directory, so
 * they are not carried on the wire either.
 */
interface RunnerRequest {
    /** Adapter UUID (subdir under ADAPTERS_ROOT on the runner side). */
    scriptDirName: string;
    /** Operation UUID (subdir under OPERATIONS_ROOT on the runner side). */
    operationId: string;
    /** Path relative to `<OPERATIONS_ROOT>/<operationId>/` where the runner reads input. */
    inputRelPath: string;
    /** Path relative to `<OPERATIONS_ROOT>/<operationId>/` where the runner writes output. */
    outputRelPath: string;
    timeoutSeconds: number;
}

/**
 * Runners answer with `errorType` + `errorMessage` fields (see
 * `back-end/runners/*` — the JSON body is written by hand in each server).
 * `errorType` arrives as a plain string; we narrow it to `FileProcessingErrorType`
 * at the point of use.
 */
interface RunnerResponse {
    status: 'success' | 'failure' | 'timeout';
    durationMs: number;
    errorType?: string;
    errorMessage?: string;
}

/**
 * Client for the per-language adapter runner microservices.
 *
 * The caller creates an OperationContext and writes the input file(s)
 * to `op.inputDir` (or `op.intermediateDir` — whatever the caller
 * decides is the runner's input). The runner reads from `inputDir`,
 * writes output to `outputDir`, and writes logs to `outputDir`.
 *
 * After the runner completes, this service scans `outputDir` for
 * output files (excluding well-known log files).
 */
@Injectable()
export class AdapterRunnerService {
    private readonly logger = new Logger(AdapterRunnerService.name);

    private static readonly LOG_FILES = new Set([
        'metadata.json', 'warnings.jsonl', 'stdout.log', 'stderr.log', 'install.log',
    ]);

    constructor(private readonly fileIO: FileIOService) { }

    public isRunnerEnabled(language: AdapterLanguageEnum): boolean {
        return this.runnerConfigFor(language).enabled;
    }

    public async healthCheck(language: AdapterLanguageEnum): Promise<boolean> {
        const cfg = this.runnerConfigFor(language);
        if (!cfg.enabled) return false;
        try {
            const url = `http://${cfg.host}:${cfg.port}/health`;
            const resp = await axios.get(url, { timeout: 2000 });
            return resp.status >= 200 && resp.status < 300;
        } catch {
            return false;
        }
    }

    /**
     * Runs an adapter script via the runner microservice.
     *
     * @param adapter   Adapter identification (language, scriptDirName)
     * @param inputFilePathName  API-view path the runner should read input from
     * @param outputDir API-view path the runner should write output and logs to
     * @param metadata  Context written to metadata.json for the script
     *
     * Both `inputFilePathName` and `outputDir` must lie under
     * `fileIO.apiOperationsDir/<operationId>/`. This service extracts the
     * operation id and the operation-relative paths so the wire body can be
     * filesystem-agnostic; the runner reconstructs full paths from its own
     * hardcoded `OPERATIONS_ROOT`.
     */
    public async run(
        adapter: AdapterRef,
        inputFilePathName: string,
        outputDir: string,
        metadata: AdapterRunMetadata,
    ): Promise<AdapterRunResult> {
        const cfg = this.runnerConfigFor(adapter.language);
        if (!cfg.enabled) {
            return this.failResult(
                FileProcessingErrorType.RUNNER_DISABLED,
                `The ${adapter.language} runner is not enabled in this deployment. Set the corresponding RUNNER_ENABLED environment variable and restart the API.`,
            );
        }
 
        // Metadata sidecar is written by the API at its own view of outputDir;
        // the runner reads it via its own view (derived from operationId), so
        // the sidecar path itself does not need to travel in the wire body.
        const metadataFile = path.posix.join(outputDir, 'metadata.json');

        try {
            await fs.promises.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

            const { operationId, inputRelPath, outputRelPath } =
                this.deriveOperationRelativePaths(inputFilePathName, outputDir);
            const timeoutSeconds = cfg.timeoutSeconds;

            const req: RunnerRequest = {
                scriptDirName: adapter.scriptDirName,
                operationId: operationId,
                inputRelPath: inputRelPath,
                outputRelPath: outputRelPath,
                timeoutSeconds: timeoutSeconds,
            };

            const httpTimeoutMs = (timeoutSeconds + 30) * 1000;
            const url = `http://${cfg.host}:${cfg.port}/run`;

            this.logger.log(`Running adapter #${adapter.id} '${adapter.name}' (${adapter.language}) outputDir=${outputDir}`);

            let runnerResp: RunnerResponse;
            try {
                const resp = await axios.post<RunnerResponse>(url, req, {
                    timeout: httpTimeoutMs,
                    headers: { 'Content-Type': 'application/json' },
                });
                runnerResp = resp.data;
            } catch (err) {
                return await this.onHttpError(err, adapter.name, outputDir);
            }

            const stdout = await this.readFileSafe(path.posix.join(outputDir, 'stdout.log'));
            const stderr = await this.readFileSafe(path.posix.join(outputDir, 'stderr.log'));
            const installLog = (await this.readFileSafe(path.posix.join(outputDir, 'install.log'))) || null;
            const warnings = await this.readWarningsFile(path.posix.join(outputDir, 'warnings.jsonl'));
            const outputFiles = await this.scanOutputFiles1(outputDir);

            this.logger.log(`Adapter run completed with status '${runnerResp.status}' in ${runnerResp.durationMs}ms. Output files: ${outputFiles.join(', ')}`);

            const baseResult = {
                durationMs: runnerResp.durationMs,
                outputFiles,
                stdout,
                stderr,
                installLog,
                warnings,
            };

            if (runnerResp.status === 'success') {
                if (outputFiles.length === 0) {
                    // Runner completed cleanly but the script wrote nothing.
                    // Flag it so the UI can surface "success but empty output".
                    return {
                        ...baseResult,
                        status: 'success',
                        error: {
                            type: FileProcessingErrorType.OUTPUT_MISSING,
                            message: 'Adapter completed successfully but produced no output files.',
                        },
                    };
                }
                // Clean success — no error attached.
                return { ...baseResult, status: 'success' };
            }

            // Failure or timeout — propagate the runner's own error info.
            return {
                ...baseResult,
                status: runnerResp.status,
                error: {
                    type: this.mapRunnerErrorType(runnerResp.errorType),
                    message: runnerResp.errorMessage ?? 'Adapter run failed. See stderr.log for details.',
                },
            };

        } catch (err) {
            this.logger.error(`Unexpected error running adapter '${adapter.name}': ${(err as Error).message}`);
            return this.failResult(FileProcessingErrorType.RUNTIME_ERROR, `Unexpected error: ${(err as Error).message}`);
        }
    }

    //--------------------------------------------------------------------
    // Internals
    //--------------------------------------------------------------------

    /**
     * Converts the API-view input file path and output directory into the
     * `{ operationId, inputRelPath, outputRelPath }` triple carried on the
     * wire. Both paths must sit under `<apiOperationsDir>/<operationId>/`.
     *
     * Splits the first path segment (the operation id) off and returns the
     * remainder as the operation-relative paths the runner will splice with
     * its own `OPERATIONS_ROOT`.
     */
    private deriveOperationRelativePaths(
        inputFilePathName: string,
        outputDir: string,
    ): { operationId: string; inputRelPath: string; outputRelPath: string } {
        const opsRoot = this.fileIO.apiOperationsDir;
        const inputFromOps = path.posix.relative(opsRoot, inputFilePathName.replaceAll('\\', '/'));
        const outputFromOps = path.posix.relative(opsRoot, outputDir.replaceAll('\\', '/'));

        if (inputFromOps.startsWith('..') || outputFromOps.startsWith('..')) {
            throw new Error(
                `Adapter runner paths must sit under the operations root (${opsRoot}). ` +
                `Got input='${inputFilePathName}', output='${outputDir}'.`,
            );
        }

        const [inputOpId, ...inputRest] = inputFromOps.split('/');
        const [outputOpId, ...outputRest] = outputFromOps.split('/');

        if (!inputOpId || inputOpId !== outputOpId) {
            throw new Error(
                `Input and output must belong to the same operation. ` +
                `Got inputOpId='${inputOpId}', outputOpId='${outputOpId}'.`,
            );
        }

        return {
            operationId: inputOpId,
            inputRelPath: inputRest.join('/'),
            outputRelPath: outputRest.join('/'),
        };
    }

    /**
     * Narrows the runner's plain-string `errorType` to a `FileProcessingErrorType`
     * enum value. Any unknown or missing string falls back to `RUNTIME_ERROR`
     * so callers don't have to defend against out-of-band strings from a
     * future runner version.
     */
    private mapRunnerErrorType(errorType: string | undefined): FileProcessingErrorType {
        if (errorType && (Object.values(FileProcessingErrorType) as string[]).includes(errorType)) {
            return errorType as FileProcessingErrorType;
        }
        return FileProcessingErrorType.RUNTIME_ERROR;
    }

    /**
     * Scans outputDir for files that are not well-known log files.
     * These are the actual output files produced by the adapter script.
     */
    private async scanOutputFiles1(outputDir: string): Promise<string[]> {
        try {
            const entries = await fs.promises.readdir(outputDir, { withFileTypes: true });
            return entries
                .filter(e => e.isFile() && !AdapterRunnerService.LOG_FILES.has(e.name))
                .map(e => e.name);
        } catch {
            return [];
        }
    }

    private runnerConfigFor(language: AdapterLanguageEnum): { enabled: boolean; host: string; port: number; timeoutSeconds: number } {
        switch (language) {
            case AdapterLanguageEnum.PYTHON: return AppConfig.adapterRunners.python;
            case AdapterLanguageEnum.R: return AppConfig.adapterRunners.r;
            case AdapterLanguageEnum.JAVASCRIPT: return AppConfig.adapterRunners.javascript;
            case AdapterLanguageEnum.SQL: return AppConfig.adapterRunners.sql;
        }
    }

    private async onHttpError(err: unknown, adapterName: string, outputDir: string): Promise<AdapterRunResult> {
        const axiosErr = err as AxiosError;
        const code = axiosErr?.code ?? '';

        // Try to read any logs the runner may have written before the error
        const stdout = await this.readFileSafe(path.posix.join(outputDir, 'stdout.log'));
        const stderr = await this.readFileSafe(path.posix.join(outputDir, 'stderr.log'));

        if (code === 'ECONNABORTED' || /timeout/i.test(axiosErr?.message ?? '')) {
            this.logger.warn(`Adapter '${adapterName}' timed out at the HTTP layer`);
            return { ...this.failResult(FileProcessingErrorType.TIMEOUT, 'Adapter run exceeded the wall-clock timeout.'), stdout, stderr };
        }

        if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'EHOSTUNREACH') {
            this.logger.warn(`Runner unreachable for adapter '${adapterName}': ${code}`);
            return {
                ...this.failResult(
                    FileProcessingErrorType.RUNNER_UNREACHABLE,
                    'The adapter runner is not reachable. Check that the runner container is running and network-accessible from the API.',
                ),
                stdout, stderr,
            };
        }

        this.logger.error(`Unexpected HTTP error from runner: ${axiosErr?.message}`);
        return { ...this.failResult(FileProcessingErrorType.RUNTIME_ERROR, `Unexpected runner HTTP error: ${axiosErr?.message ?? 'unknown'}`), stdout, stderr };
    }

    private failResult(type: FileProcessingErrorType, message: string): AdapterRunResult {
        return { status: 'failure', durationMs: 0, outputFiles: [], stdout: '', stderr: '', installLog: null, warnings: [], error: { type, message } };
    }

    private async readFileSafe(filePath: string): Promise<string> {
        try { return await fs.promises.readFile(filePath, 'utf8'); } catch { return ''; }
    }

    private async readWarningsFile(filePath: string): Promise<AdapterWarning[]> {
        const content = await this.readFileSafe(filePath);
        if (!content.trim()) return [];
        const warnings: AdapterWarning[] = [];
        for (const line of content.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                const parsed = JSON.parse(trimmed);
                if (typeof parsed === 'object' && parsed !== null && typeof parsed.message === 'string') {
                    warnings.push({ message: parsed.message, detail: parsed.detail });
                }
            } catch { /* non-JSON line */ }
        }
        return warnings;
    }
}
