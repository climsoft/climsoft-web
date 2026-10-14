import { Controller, Get, Delete, Patch, Post, Param, Query, ParseIntPipe, ParseDatePipe, ParseEnumPipe, StreamableFile, BadRequestException, Req } from '@nestjs/common';
import { StreamableFileUtils } from 'src/shared/utils/streamable-file.utils';
import { Admin } from 'src/user/decorators/admin.decorator';
import { ConnectorRunService, ConnectorRunFilters } from '../services/connector-run.service';
import { ConnectorRunQueryDto } from '../dtos/connector-run-query.dto';
import { ViewConnectorRunDto } from '../dtos/view-connector-run.dto';
import { ConnectorRunFileService } from '../services/connector-run-file.service';
import { ConnectorRunFileEntity, RunFileStatusEnum } from '../entities/connector-run-file.entity';
import { ConnectorRunSpecService } from '../services/connector-run-spec.service';
import { ConnectorRunSpecEntity } from '../entities/connector-run-spec.entity';
import { ACTIVE_RUN_STATUSES, ConnectorRunStatusEnum } from '../entities/connector-run.entity';
import { ConnectorSchedulerService } from '../services/connector-scheduler.service';
import { Request } from 'express';
import { AuthUtil } from 'src/user/services/auth.util';

@Controller('connector-runs')
export class ConnectorRunsController {
    constructor(
        private readonly connectorRunService: ConnectorRunService,
        private readonly runFileService: ConnectorRunFileService,
        private readonly runSpecService: ConnectorRunSpecService,
        private readonly schedulerService: ConnectorSchedulerService,
    ) { }

    @Admin()
    @Get()
    async findAll(@Query() query: ConnectorRunQueryDto): Promise<ViewConnectorRunDto[]> {
        return this.connectorRunService.findAll(
            this.buildFilters(query),
            { page: query.page, pageSize: query.pageSize },
        );
    }

    @Admin()
    @Get('count')
    async count(@Query() query: ConnectorRunQueryDto): Promise<number> {
        return this.connectorRunService.count(this.buildFilters(query));
    }

    @Admin()
    @Get('stats')
    async getStats(
        @Query('connectorId', ParseIntPipe) connectorId: number,
        @Query('startDate', new ParseDatePipe({ optional: true })) startDate?: Date,
        @Query('endDate', new ParseDatePipe({ optional: true })) endDate?: Date,
    ): Promise<{
        totalRuns: number;
        filesFailed: number;
        successfulRuns: number;
        failedRuns: number;
        lastRun: Date | null;
    }> {
        return this.connectorRunService.getConnectorStats(
            connectorId,
            startDate,
            endDate,
        );
    }

    // A "reprocess" endpoint used to sit here — DELETE run-files/:connectorId,
    // dropping de-duplication rows so the next run re-ingested the matching
    // files, filtered by source specification. It was never wired to the UI and
    // was called once in its life, and the index its specification filter
    // needed cost 493 MB on a connector holding 280k files per run, maintained
    // on every one of those inserts. Deleting the runs achieves the same thing
    // today. If it comes back it should filter by BINDING, which is what the
    // file rows are keyed by now, and which the primary key already serves —
    // no extra index.
    /**
     * Bulk delete — the "I have archived and cleared the file server, start
     * fresh" action. Takes the SAME query parameters as the run list, and
     * deletes exactly the runs that list would show, so what is about to be
     * destroyed is something the sysadmin can page through and count first.
     *
     * `page`/`pageSize` are ignored: this deletes the whole matching set, not
     * the page being looked at.
     *
     * Cascades to the run specs and run files, INCLUDING the import
     * de-duplication rows, so a connector whose newest snapshot is in the set
     * re-evaluates every file still visible on the server next time it runs.
     *
     * Queued and running runs are never deleted — `skippedActive` reports how
     * many were left alone, so the caller can say so rather than leaving the
     * sysadmin wondering why the count did not reach zero.
     */
    @Admin()
    @Delete()
    async deleteAll(@Query() query: ConnectorRunQueryDto): Promise<{ deleted: number; skippedActive: number }> {
        return this.connectorRunService.deleteByFilters(this.buildFilters(query));
    }

    /**
     * Per-specification breakdown for one run — which spec scanned how many
     * files and how long it spent doing it. Backs the "which directory needs a
     * clean-up" drill-down.
     */
    @Admin()
    @Get(':id/specs')
    async findRunSpecs(@Param('id', ParseIntPipe) id: number): Promise<ConnectorRunSpecEntity[]> {
        return this.runSpecService.findByRun(id);
    }

    /**
     * Paginated per-file detail for one run, from the connector_run_files
     * ledger. Import: every file the run acted on. Export: only failures.
     * Connection/listing failures that abort a run are on
     * the run's own `errorMessage` instead (such a run records no files).
     */
    @Admin()
    @Get(':id/files')
    async findRunFiles(
        @Param('id', ParseIntPipe) id: number,
        @Query('status', new ParseEnumPipe(RunFileStatusEnum, { optional: true })) status?: RunFileStatusEnum,
        // Narrows whatever `status` already selected — the two are ANDed.
        @Query('search') search?: string,
        @Query('fromDate') fromDate?: string,
        @Query('toDate') toDate?: string,
        @Query('page', new ParseIntPipe({ optional: true })) page?: number,
        @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    ): Promise<{ files: ConnectorRunFileEntity[]; total: number }> {
        return this.runFileService.findByRun(id, {
            status,
            search,
            fromDate: ConnectorRunsController.parseDate(fromDate),
            toDate: ConnectorRunsController.parseDate(toDate),
            page,
            pageSize,
        });
    }

    /** An ISO timestamp from the query string, or undefined if absent/unusable. */
    private static parseDate(value: string | undefined): Date | undefined {
        if (!value) {
            return undefined;
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    /**
     * Download the file a failed import kept, so a sysadmin can see what the
     * adapter or the transform actually choked on without shelling into the
     * container.
     *
     * Only failed import files retain a directory, and only up to a per-run
     * budget, so a row may legitimately have none — the frontend hides the link
     * in that case and this 404s if it is called anyway.
     *
     * Addressed by the row's own key rather than by operation id, so an
     * arbitrary operation id in a URL cannot be used to read directories the
     * connector never retained. The remote path travels as a query parameter
     * because it contains slashes and would not survive a path segment.
     */
    @Admin()
    @Get(':id/files/download')
    async downloadRunFile(
        @Param('id', ParseIntPipe) id: number,
        @Query('bindingId', ParseIntPipe) bindingId: number,
        @Query('remotePath') remotePath: string,
    ): Promise<StreamableFile> {
        const { buffer, filename } = await this.connectorRunService.buildRunFileDownload(id, bindingId, remotePath);
        return StreamableFileUtils.asAttachment(buffer, filename);
    }

    @Admin()
    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ViewConnectorRunDto> {
        return this.connectorRunService.findOneView(id);
    }

    @Admin()
    @Delete(':id')
    async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.connectorRunService.delete(id);
    }

    /**
     * Queue a run now. Coalesces the same way a schedule does, so asking twice
     * while one is going returns the run already in flight rather than starting
     * a second — two drains of one connector would claim the same rows.
     */
    @Admin()
    @Post('connector/:connectorId/trigger')
    async trigger(
        @Param('connectorId', ParseIntPipe) connectorId: number,
        @Req() request: Request,
    ): Promise<ViewConnectorRunDto> {
        const run = await this.schedulerService.triggerConnectorManually(connectorId, AuthUtil.getLoggedInUserId(request));
        return this.connectorRunService.findOneView(run.id);
    }

    /**
     * Stop a run. A queued one never starts; a running one stops at its next
     * batch boundary, since nothing can interrupt a handler already going.
     *
     * This stops the run, not the work: whatever it had not yet ingested stays
     * `pending` and the next run resumes it. Stopping the connector altogether
     * is its `disabled` flag; abandoning the backlog is deleting the run.
     */
    @Admin()
    @Patch(':id/cancel')
    async cancel(@Param('id', ParseIntPipe) id: number): Promise<ViewConnectorRunDto> {
        const run = await this.connectorRunService.findOne(id);

        if (!ACTIVE_RUN_STATUSES.includes(run.status)) {
            throw new BadRequestException(`Run #${id} cannot be cancelled. It is already ${run.status}.`);
        }

        await this.connectorRunService.cancel(id);
        return this.connectorRunService.findOneView(id);
    }

    /**
     * Put a failed run back in the queue. The same row is reused, so whatever it
     * already discovered and ingested stays attached and the retry resumes
     * rather than re-listing.
     */
    @Admin()
    @Patch(':id/retry')
    async retry(@Param('id', ParseIntPipe) id: number): Promise<ViewConnectorRunDto> {
        const run = await this.connectorRunService.findOne(id);

        if (run.status !== ConnectorRunStatusEnum.FAILED) {
            throw new BadRequestException(`Run #${id} cannot be retried. Only a failed run can be, and this one is ${run.status}.`);
        }

        if (!await this.connectorRunService.retry(id)) {
            throw new BadRequestException(`Run #${id} has exhausted its ${run.maxAttempts} attempt(s).`);
        }

        return this.connectorRunService.findOneView(id);
    }

    private buildFilters(query: ConnectorRunQueryDto): ConnectorRunFilters {
        const filters: ConnectorRunFilters = {};

        if (query.connectorId) {
            filters.connectorId = query.connectorId;
        }

        if (query.startDate) {
            filters.startDate = new Date(query.startDate);
        }

        if (query.endDate) {
            filters.endDate = new Date(query.endDate);
        }

        if (query.hasErrors !== undefined) {
            filters.hasErrors = query.hasErrors;
        }

        if (query.status) {
            filters.status = query.status;
        }

        if (query.discoveredOnly) {
            filters.discoveredOnly = query.discoveredOnly;
        }

        return filters;
    }
}
