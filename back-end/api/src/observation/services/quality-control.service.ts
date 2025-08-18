import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObservationEntity } from '../entities/observation.entity';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { DateUtils } from 'src/shared/utils/date.utils';

@Injectable()
export class QualityControlService {

    constructor(
        @InjectRepository(ObservationEntity) private observationRepo: Repository<ObservationEntity>,) { }

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

    public async performQC(queryDto: ViewObservationQueryDTO, userId: number) {
        // Important. limit the date selection to 10 years for perfomance reasons
        //TODO. Later find a way of doing this at the DTO level
        if (queryDto.fromDate && queryDto.toDate) {
            if (DateUtils.isMoreThanTenCalendarYears(new Date(queryDto.fromDate), new Date(queryDto.toDate))) {
                throw new BadRequestException('Date range exceeds 10 years');
            }
        } else {
            throw new BadRequestException('Date range required');
        }

        let whereExpression: string = this.getQueryFilter(queryDto);

        if (queryDto.qcStatus) {
            whereExpression = whereExpression + ` AND qc_status = '${queryDto.qcStatus}'`;
        }

        const query = `
        SELECT ( COUNT(*) FILTER (WHERE func_execute_qc_tests(observation_record, ${userId}) IS FALSE) ) AS qc_fails  
        FROM (SELECT * FROM observations WHERE ${whereExpression}) AS observation_record;
        `;
        console.log('qc query: ', query, ' | query dto: ', queryDto)

        // As of 14/06/2025 it was noticed that when this is called multiple times a deadlock occurs at the nodejs level.
        // postgres seems to lock the table as well. So it is important to narrow the selection as much as possible.
        const results = await this.observationRepo.query(query);
        const qcFails: number = results ? results[0].qc_fails : 0;
        return { message: 'success', qcFails: qcFails };
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

        // Ignore deleted values by default.
        return `${where} deleted = FALSE`;
    }

    private getQueryDateFilter(queryDto: ViewObservationQueryDTO): string | null {
        // Important. limit the date selection to 10 years for perfomance reasons.
        if (queryDto.fromDate && queryDto.toDate) {
            if (DateUtils.isMoreThanTenCalendarYears(new Date(queryDto.fromDate), new Date(queryDto.toDate))) {
                throw new BadRequestException('Date range exceeds 10 years');
            }
        } else {
            throw new BadRequestException('Date range required');
        }

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
