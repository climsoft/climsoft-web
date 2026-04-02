import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObservationEntity } from '../entities/observation.entity';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { BulkFilterUtils, FilterWhereClauseResult } from './bulk-filter.utils';
import { BulkObservationFilterDto } from '../dtos/bulk-observation-filter.dto';

@Injectable()
export class SourceCheckService {

    constructor(
        @InjectRepository(ObservationEntity) private observationRepo: Repository<ObservationEntity>,
    ) { }

    public async existsDuplicates(dto: ViewObservationQueryDTO): Promise<boolean> {
        const filter = this.extractFilter(dto);
        const filterResult = BulkFilterUtils.buildFilterWhereClause(filter, 'o', 1);
        const whereClause = BulkFilterUtils.toWhereClauseSql(filterResult);

        const query = `
            SELECT 1 FROM observations o
            WHERE o.deleted = FALSE${whereClause.sql}
            GROUP BY o.station_id, o.element_id, o.level, o.interval, o.date_time
            HAVING COUNT(DISTINCT o.source_id) > 1
            LIMIT 1
        `;

        const result = await this.observationRepo.query(query, whereClause.params);
        return result.length > 0;
    }

    public async countDuplicates(dto: ViewObservationQueryDTO): Promise<number> {
        const filter: BulkObservationFilterDto = this.extractFilter(dto);
        const filterResult: FilterWhereClauseResult = BulkFilterUtils.buildFilterWhereClause(filter, 'o', 1);
        const whereClause: { sql: string; params: any[] } = BulkFilterUtils.toWhereClauseSql(filterResult);

        const query = `
            SELECT COUNT(*)::int AS count
            FROM (
                SELECT 1 FROM observations o
                WHERE o.deleted = FALSE${whereClause.sql}
                GROUP BY o.station_id, o.element_id, o.level, o.interval, o.date_time
                HAVING COUNT(DISTINCT o.source_id) > 1
            ) sub
        `;

        const result = await this.observationRepo.query(query, whereClause.params);
        return result && result.length > 0 ? result[0].count : 0;
    }

    public async findDuplicates(dto: ViewObservationQueryDTO) {
        if (!dto.page || !dto.pageSize || dto.pageSize >= 1000) {
            throw new BadRequestException('You must specify page and page size. Page size must be less than 1000');
        }

        const filter: BulkObservationFilterDto = this.extractFilter(dto);
        const filterResult: FilterWhereClauseResult = BulkFilterUtils.buildFilterWhereClause(filter, 'o', 1);
        const whereClause: { sql: string; params: any[] } = BulkFilterUtils.toWhereClauseSql(filterResult);

        const limitParamIndex = filterResult.paramIndex;
        const offsetParamIndex = filterResult.paramIndex + 1;

        const query = `
            SELECT o.station_id, o.element_id, o.level, o.date_time, o.interval,
                   COUNT(*)::int AS duplicates
            FROM observations o
            WHERE o.deleted = FALSE${whereClause.sql}
            GROUP BY o.station_id, o.element_id, o.level, o.interval, o.date_time
            HAVING COUNT(DISTINCT o.source_id) > 1
            ORDER BY o.station_id, o.element_id, o.level, o.interval, o.date_time
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        const params = [
            ...whereClause.params,
            dto.pageSize,
            (dto.page - 1) * dto.pageSize,
        ];

        const result = await this.observationRepo.query(query, params);

        return result.map((item: any) => ({
            stationId: item.station_id,
            elementId: item.element_id,
            level: item.level,
            datetime: item.date_time,
            interval: item.interval,
            duplicates: item.duplicates,
        }));
    }

    private extractFilter(dto: ViewObservationQueryDTO): BulkObservationFilterDto {
        const filter = new BulkObservationFilterDto();
        filter.stationIds = dto.stationIds;
        filter.elementIds = dto.elementIds;
        filter.level = dto.level;
        filter.intervals = dto.intervals;
        filter.sourceIds = dto.sourceIds;
        filter.fromDate = dto.fromDate;
        filter.toDate = dto.toDate;
        filter.hours = dto.hours;
        filter.useEntryDate = dto.useEntryDate;
        return filter;
    }
}
