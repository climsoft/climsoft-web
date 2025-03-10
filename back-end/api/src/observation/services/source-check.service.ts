import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObservationEntity } from '../entities/observation.entity';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { DateUtils } from 'src/shared/utils/date.utils';

@Injectable()
export class SourceCheckService {

    constructor(
        @InjectRepository(ObservationEntity) private readonly observationRepo: Repository<ObservationEntity>) { }


    public async findObservationsWithDuplicates(selectObsevationDto: ViewObservationQueryDTO) {

        // TODO. This is a temporary check. Find out how we can do this at the dto validation level.
        if (!selectObsevationDto.page || !selectObsevationDto.pageSize || selectObsevationDto.pageSize >= 1000) {
            throw new BadRequestException("You must specify page and page size. Page size must be less than 100")
        }

        const whereExpression = this.getProcessedFilter(selectObsevationDto);

        const query = `
          SELECT station_id, element_id, level, date_time, interval, COUNT(*) AS duplicates
          FROM observations 
          WHERE ${whereExpression} 
          GROUP BY 
            station_id, element_id, level, interval, date_time
          HAVING 
            COUNT(DISTINCT source_id) > 1
          ORDER BY station_id, element_id, level, interval, date_time DESC
          LIMIT ${selectObsevationDto.pageSize} 
          OFFSET ${(selectObsevationDto.page - 1) * selectObsevationDto.pageSize};
        `;

        // Passing limit and offset as parameters
        const result = await this.observationRepo.query(query);
        const formattedResult: { stationId: string, elementId: number, level: number, datetime: string, interval: number, duplicates: number }[] = [];
        for (const item of result) {
            formattedResult.push(
                {
                    stationId: item.station_id,
                    elementId: item.element_id,
                    level: item.level,
                    datetime: item.date_time,
                    interval: item.interval,
                    duplicates: item.duplicates
                }
            );
        }

        return formattedResult;
    }

    public async countObservationsWithDuplicates(selectObsevationDto: ViewObservationQueryDTO): Promise<number> {
        const whereExpression = this.getProcessedFilter(selectObsevationDto);
        const query = `
        SELECT COUNT(*) AS count_num
        FROM 
        ( 
          SELECT 1 FROM observations  
          WHERE ${whereExpression}
          GROUP BY 
           station_id, element_id, level, interval, date_time
           HAVING COUNT(DISTINCT source_id) > 1
        );`;

        const result = await this.observationRepo.query(query);
        return result && result.length > 0 ? result[0].count_num : 0;
    }

    public async sumOfObservationsWithDuplicates(selectObsevationDto: ViewObservationQueryDTO): Promise<number> {
        const whereExpression = this.getProcessedFilter(selectObsevationDto);
        const query = `
        SELECT SUM(count_num) AS sum_num 
        FROM 
        (
          SELECT COUNT(*) - 1 AS count_num FROM observations 
          WHERE ${whereExpression} 
          GROUP BY station_id, element_id, level, interval, date_time
          HAVING COUNT(DISTINCT source_id) > 1
        );`;

        const result = await this.observationRepo.query(query);
        return result && result.length > 0 ? result[0].sum_num : 0;
    }



    private getProcessedFilter(selectObsevationDto: ViewObservationQueryDTO): string {

        let where: string = "deleted = FALSE";

        if (selectObsevationDto.stationIds) {
            where = `${where} AND station_id = '${selectObsevationDto.stationIds[0]}'`;
        }

        if (selectObsevationDto.elementIds) {
            where = `${where} AND element_id = ${selectObsevationDto.elementIds[0]}`;
        }

        if (selectObsevationDto.interval) {
            where = `${where} AND interval = ${selectObsevationDto.interval}`;
        }

        if (selectObsevationDto.level !== undefined) {
            where = `${where} AND elevation = ${selectObsevationDto.level}`;
        }

        const dateOperator: string | null = this.getProcessedObsDateFilter(selectObsevationDto);
        if (dateOperator) {
            where = `${where} AND ( ${dateOperator} )`;
        }

        return where;
    }

    private getProcessedObsDateFilter(selectObsevationDto: ViewObservationQueryDTO): string | null {
        let dateOperator: string | null = null;
        const dateColToUse: string = selectObsevationDto.useEntryDate ? 'entry_date_time' : 'date_time';

        if (selectObsevationDto.fromDate && selectObsevationDto.toDate) {
            if (selectObsevationDto.fromDate === selectObsevationDto.toDate) {
                const strFromDate = DateUtils.getDateInSQLFormatFromDate(new Date(selectObsevationDto.fromDate), true);
                // Equal
                dateOperator = `${dateColToUse} = '${strFromDate}' `;
            } else {
                const strFromDate = DateUtils.getDateInSQLFormatFromDate(new Date(selectObsevationDto.fromDate), true);
                const strToDate = DateUtils.getDateInSQLFormatFromDate(new Date(selectObsevationDto.toDate), true);
                // Between
                dateOperator = `${dateColToUse} >= '${strFromDate}' AND ${dateColToUse} <= ${strToDate} `;
            }

        } else if (selectObsevationDto.fromDate) {
            const strFromDate = DateUtils.getDateInSQLFormatFromDate(new Date(selectObsevationDto.fromDate), true);
            // MoreThanOrEqual
            dateOperator = `${dateColToUse} >= '${strFromDate}' `;
        } else if (selectObsevationDto.toDate) {
            const strToDate = DateUtils.getDateInSQLFormatFromDate(new Date(selectObsevationDto.toDate), true);
            // LessThanOrEqual
            dateOperator = `${dateColToUse} <= '${strToDate}' `;
        }

        return dateOperator;

    }

}
