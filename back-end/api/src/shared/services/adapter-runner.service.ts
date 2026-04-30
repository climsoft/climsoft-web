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
 */
export interface AdapterRef {
    id: number;
    name: string;
    language: AdapterLanguageEnum;
    scriptDirName: string;
    entryPoint: string;
}

/**
 * Context fields written into `metadata.json` for the script to read.
 */
export interface AdapterRunMetadata {
    //originalFileName: string;
    uploadedByUserId: number;
    uploadedAt: string;
    sourceSpecId: number | null;
    sourceSpecName: string | null;
    stationId: string | null;
    utcOffset: number | null;
    specParameters: Record<string, unknown> | null;
    testRun: boolean;
}

export interface AdapterRunResult {
    status: 'success' | 'failure';
    durationMs: number;
    outputFiles: string[];
    stdout: string;
    stderr: string;
    installLog: string | null;
    warnings: AdapterWarning[];
    error?: FileProcessingError;
}

interface RunnerRequest {
    scriptDir: string;
    entryPoint: string;
    inputFilePathName: string;
    outputDir: string;
    metadataFile: string;
    timeoutSeconds: number;
}

interface RunnerResponse {
    status: 'success' | 'failure';
    durationMs: number;
    error?: FileProcessingErrorType;
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
     * @param adapter   Adapter identification (language, scriptDir, entryPoint)
     * @param inputFilePathName  Directory the runner reads input from
     * @param outputDir Directory the runner writes output and logs to
     * @param metadata  Context written to metadata.json for the script
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

        const metadataFile = path.posix.join(outputDir, 'metadata.json');

        try {
            await fs.promises.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf8');

            const scriptDir = this.fileIO.getAdapterScriptDir(adapter.scriptDirName);
            const timeoutSeconds = cfg.timeoutSeconds;

            const req: RunnerRequest = {
                scriptDir: scriptDir,
                entryPoint: adapter.entryPoint,
                inputFilePathName: inputFilePathName,
                outputDir: outputDir,
                metadataFile: metadataFile,
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
            const outputFiles = await this.scanOutputFiles(outputDir);

            if (runnerResp.status === 'success' && outputFiles.length > 0) {
                return {
                    status: 'success',
                    durationMs: runnerResp.durationMs,
                    outputFiles: outputFiles,
                    stdout: stdout,
                    stderr: stderr,
                    installLog: installLog,
                    warnings: warnings,
                    error: {type: FileProcessingErrorType.OUTPUT_MISSING, message: 'no files output'},
                };
            }else{
                 return {
                    status: runnerResp.status,
                    durationMs: runnerResp.durationMs,
                    outputFiles: outputFiles,
                    stdout: stdout,
                    stderr: stderr,
                    installLog: installLog,
                    warnings: warnings,
                    error: {type: FileProcessingErrorType.OUTPUT_MISSING, message: 'runner failed'},
                };

            }

        } catch (err) {
            this.logger.error(`Unexpected error running adapter '${adapter.name}': ${(err as Error).message}`);
            return this.failResult(FileProcessingErrorType.RUNTIME_ERROR, `Unexpected error: ${(err as Error).message}`);
        }
    }

    //--------------------------------------------------------------------
    // Internals
    //--------------------------------------------------------------------

    /**
     * Scans outputDir for files that are not well-known log files.
     * These are the actual output files produced by the adapter script.
     */
    private async scanOutputFiles(outputDir: string): Promise<string[]> {
        try {
            const entries = await fs.promises.readdir(outputDir, { withFileTypes: true });
            return entries
                .filter(e => e.isFile() && !AdapterRunnerService.LOG_FILES.has(e.name))
                .map(e => path.posix.join(outputDir, e.name));
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
