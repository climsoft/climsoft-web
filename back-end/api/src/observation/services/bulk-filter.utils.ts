import { BulkObservationFilterDto } from '../dtos/bulk-observation-filter.dto';

export interface FilterWhereClauseResult {
    conditions: string[];
    params: any[];
    paramIndex: number;
}

export class BulkFilterUtils {

    static buildFilterWhereClause(filter: BulkObservationFilterDto, tableAlias: string, startParamIndex: number): FilterWhereClauseResult {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex: number = startParamIndex;

        if (filter.stationIds && filter.stationIds.length > 0) {
            conditions.push(`${tableAlias}.station_id = ANY($${paramIndex})`);
            params.push(filter.stationIds);
            paramIndex++;
        }

        if (filter.elementIds && filter.elementIds.length > 0) {
            conditions.push(`${tableAlias}.element_id = ANY($${paramIndex})`);
            params.push(filter.elementIds);
            paramIndex++;
        }

        if (filter.level !== undefined) {
            conditions.push(`${tableAlias}.level = $${paramIndex}`);
            params.push(filter.level);
            paramIndex++;
        }

        if (filter.intervals && filter.intervals.length > 0) {
            conditions.push(`${tableAlias}.interval = ANY($${paramIndex})`);
            params.push(filter.intervals);
            paramIndex++;
        }

        if (filter.sourceIds && filter.sourceIds.length > 0) {
            conditions.push(`${tableAlias}.source_id = ANY($${paramIndex})`);
            params.push(filter.sourceIds);
            paramIndex++;
        }

        const dateColumn = filter.useEntryDate ? 'entry_date_time' : 'date_time';

        if (filter.fromDate && filter.toDate) {
            conditions.push(`${tableAlias}.${dateColumn} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            params.push(filter.fromDate, filter.toDate);
            paramIndex += 2;
        } else if (filter.fromDate) {
            conditions.push(`${tableAlias}.${dateColumn} >= $${paramIndex}`);
            params.push(filter.fromDate);
            paramIndex++;
        } else if (filter.toDate) {
            conditions.push(`${tableAlias}.${dateColumn} <= $${paramIndex}`);
            params.push(filter.toDate);
            paramIndex++;
        }

        if (filter.hours && filter.hours.length > 0) {
            // Note. The hour filter should always use the observation date time not the entry date time
            conditions.push(`EXTRACT(HOUR FROM ${tableAlias}.date_time) = ANY($${paramIndex})`);
            params.push(filter.hours);
            paramIndex++;
        }

        return { conditions, params, paramIndex };
    }

    static toWhereClauseSql(result: FilterWhereClauseResult): { sql: string; params: any[] } {
        const sql: string = result.conditions.length > 0 ? ' AND ' + result.conditions.join(' AND ') : '';
        return { sql, params: result.params };
    }
}
