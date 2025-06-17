import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObservationEntity } from '../entities/observation.entity';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';

@Injectable()
export class QCDataChecksService {

    constructor(
        @InjectRepository(ObservationEntity) private readonly observationRepo: Repository<ObservationEntity>) { }


    public async findObservationsWithDuplicates(selectObsevationDto: ViewObservationQueryDTO) {

        // TODO. This is a temporary check. Find out how we can do this at the dto validation level.
        if (!selectObsevationDto.page || !selectObsevationDto.pageSize || selectObsevationDto.pageSize >= 1000) {
            throw new BadRequestException("You must specify page and page size. Page size must be less than 1000")
        }

        const whereExpression = this.getQueryFilter(selectObsevationDto);

        const query = `
          SELECT station_id, element_id, level, date_time, interval, COUNT(*) AS duplicates
          FROM observations 
          WHERE ${whereExpression} 
          GROUP BY 
            station_id, element_id, level, interval, date_time
          HAVING 
            COUNT(DISTINCT source_id) > 1
          ORDER BY station_id, element_id, level, interval, date_time 
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
        const whereExpression = this.getQueryFilter(selectObsevationDto);
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


    private getQueryFilter(queryDto: ViewObservationQueryDTO): string {
        let where: string = '';
        if (queryDto.stationIds && queryDto.stationIds.length > 0) {
            where = where + ` station_id IN (${queryDto.stationIds.map(id => `'${id}'`).join(',')}) AND`;
        }

        if (queryDto.elementIds && queryDto.elementIds.length > 0) {
            where = where + ` element_id IN (${queryDto.elementIds.join(',')}) AND`;
        }

        if (queryDto.level !== undefined) {
            where = `${where} level = ${queryDto.level} AND`;
        }

        if (queryDto.intervals) {
            where = `${where} interval = ${queryDto.intervals} AND`;
        }

        const dateOperator: string | null = this.getQueryDateFilter(queryDto);
        if (dateOperator) {
            where = `${where} ( ${dateOperator} ) AND`;
        }

        return `${where} deleted = FALSE`;
    }

    private getQueryDateFilter(queryDto: ViewObservationQueryDTO): string | null {
        let dateOperator: string | null = null;
        const dateColToUse: string = queryDto.useEntryDate ? 'entry_date_time' : 'date_time';
        const strFromDate: string = queryDto.fromDate ? queryDto.fromDate.replace('T', ' ').replace('Z', '') : '';
        const strToDate: string = queryDto.toDate ? queryDto.toDate.replace('T', ' ').replace('Z', '') : '';

        if (strFromDate && strToDate) {
            if (strFromDate === strToDate) {
                // Equal
                dateOperator = `${dateColToUse} = '${strFromDate}' `;
            } else {
                // Between
                dateOperator = `${dateColToUse} BETWEEN '${strFromDate}' AND '${strToDate}'`;
            }

        } else if (strFromDate) {
            // MoreThanOrEqual
            dateOperator = `${dateColToUse} >= '${strFromDate}' `;
        } else if (strToDate) {
            // LessThanOrEqual
            dateOperator = `${dateColToUse} <= '${strToDate}' `;
        }

        return dateOperator;

    }

}
