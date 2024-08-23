import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Equal, FindManyOptions, FindOperator, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ObservationEntity } from '../entities/observation.entity';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { ElementsService } from 'src/metadata/services/elements/elements.service';
import { ViewObservationDto } from '../dtos/view-observation.dto';
import { StationsService } from 'src/metadata/services/stations/stations.service';
import { QCStatusEnum } from '../enums/qc-status.enum';
import { CreateObservationQueryDto } from '../dtos/create-observation-query.dto';
import { ViewObservationLogQueryDto } from '../dtos/view-observation-log-query.dto';
import { ViewObservationLogDto } from '../dtos/view-observation-log.dto';
import { SourcesService } from 'src/metadata/controllers/sources/services/sources.service';
import { NumberUtils } from 'src/shared/utils/number.utils';
import { DeleteObservationDto } from '../dtos/delete-observation.dto';

@Injectable()
export class ObservationsService {

    constructor(
        @InjectRepository(ObservationEntity) private readonly observationRepo: Repository<ObservationEntity>,
        private readonly stationsService: StationsService,
        private readonly elementsService: ElementsService,
        private readonly sourcesService: SourcesService,
    ) { }


    public async findProcessed(selectObsevationDto: ViewObservationQueryDTO): Promise<ViewObservationDto[]> {

        // TODO. Below code should be optimised using SQL INNER JOINS when querying.

        const obsView: ViewObservationDto[] = [];

        const obsEntities = await this.findObsEntities(selectObsevationDto);

        // TODO. Later use inner joins, this will make the loading of metadata redundant. 
        const stationEntities = await this.stationsService.findAll();
        const elementEntities = await this.elementsService.findAll();
        const sourceEntities = await this.sourcesService.findAll();

        for (const obsEntity of obsEntities) {

            const viewObs: ViewObservationDto = new ViewObservationDto();
            viewObs.stationId = obsEntity.stationId;
            viewObs.elementId = obsEntity.elementId;
            viewObs.sourceId = obsEntity.sourceId;
            viewObs.elevation = obsEntity.elevation;
            viewObs.period = obsEntity.period;
            viewObs.datetime = obsEntity.datetime.toISOString();
            viewObs.value = obsEntity.value;
            viewObs.flag = obsEntity.flag;
            viewObs.entryDatetime = obsEntity.entryDateTime.toISOString();
            viewObs.comment = obsEntity.comment;

            const station = stationEntities.find(data => data.id === obsEntity.stationId);
            if (station) {
                viewObs.stationName = station.name;
            }

            const element = elementEntities.find(data => data.id === obsEntity.elementId);
            if (element) {
                viewObs.elementAbbrv = element.abbreviation;
            }

            const source = sourceEntities.find(data => data.id === obsEntity.sourceId);
            if (source) {
                viewObs.sourceName = source.name;
            }

            obsView.push(viewObs);
        }

        return obsView;

    }


    private async findObsEntities(selectObsevationDto: ViewObservationQueryDTO): Promise<ObservationEntity[]> {
        const whereOptions: FindOptionsWhere<ObservationEntity> = this.setProcessedFilter(selectObsevationDto);
        const findOptions: FindManyOptions<ObservationEntity> = {
            order: {
                stationId: "ASC",
                elementId: "ASC",
                sourceId: "ASC",
                elevation: "ASC",
                datetime: "ASC"
            },
            where: whereOptions
        };

        // TODO. This is a temporary check. Find out how we can do this at the dto validation level.
        if (!selectObsevationDto.page || !selectObsevationDto.pageSize || selectObsevationDto.pageSize >= 1000) {
            throw new BadRequestException("You must specify page and page size. Page size must be less than 100")
        }


        if (selectObsevationDto.page && selectObsevationDto.pageSize) {
            findOptions.skip = (selectObsevationDto.page - 1) * selectObsevationDto.pageSize;
            findOptions.take = selectObsevationDto.pageSize
        }


        return this.observationRepo.find(findOptions);
    }

    public async countEntities(selectObsevationDto: ViewObservationQueryDTO): Promise<number> {
        const whereOptions: FindOptionsWhere<ObservationEntity> = this.setProcessedFilter(selectObsevationDto);
        return this.observationRepo.countBy(whereOptions)
    }

    private setProcessedFilter(selectObsevationDto: ViewObservationQueryDTO): FindOptionsWhere<ObservationEntity> {
        const whereOptions: FindOptionsWhere<ObservationEntity> = {};

        if (selectObsevationDto.stationIds) {
            whereOptions.stationId = In(selectObsevationDto.stationIds);
        }

        if (selectObsevationDto.elementIds) {
            whereOptions.elementId = In(selectObsevationDto.elementIds);
        }

        if (selectObsevationDto.sourceIds) {
            whereOptions.sourceId = In(selectObsevationDto.sourceIds);
        }

        if (selectObsevationDto.period) {
            whereOptions.period = selectObsevationDto.period;
        }

        this.setProcessedObsDateFilter(selectObsevationDto, whereOptions);

        whereOptions.deleted = false;
        return whereOptions;
    }

    private setProcessedObsDateFilter(selectObsevationDto: ViewObservationQueryDTO, selectOptions: FindOptionsWhere<ObservationEntity>) {
        let dateOperator: FindOperator<Date> | null = null;
        if (selectObsevationDto.fromDate && selectObsevationDto.toDate) {
            if (selectObsevationDto.fromDate === selectObsevationDto.toDate) {
                dateOperator = Equal(new Date(selectObsevationDto.fromDate));
            } else {
                dateOperator = Between(new Date(selectObsevationDto.fromDate), new Date(selectObsevationDto.toDate));
            }

        } else if (selectObsevationDto.fromDate) {
            dateOperator = MoreThanOrEqual(new Date(selectObsevationDto.fromDate))
        } else if (selectObsevationDto.toDate) {
            dateOperator = LessThanOrEqual(new Date(selectObsevationDto.toDate))
        }

        if (dateOperator !== null) {
            if (selectObsevationDto.useEntryDate) {
                selectOptions.entryDateTime = dateOperator;
            } else {
                selectOptions.datetime = dateOperator;
            }
        }

    }

    public async findRawObs(queryDto: CreateObservationQueryDto): Promise<CreateObservationDto[]> {
        const entities: ObservationEntity[] = await this.observationRepo.findBy({
            stationId: queryDto.stationId,
            elementId: In(queryDto.elementIds),
            sourceId: queryDto.sourceId,
            elevation: queryDto.elevation,
            datetime: In(queryDto.datetimes.map(datetime => new Date(datetime))),
            period: queryDto.period,
            deleted: false
        });

        const dtos: CreateObservationDto[] = entities.map(data => ({
            stationId: data.stationId,
            elementId: data.elementId,
            sourceId: data.sourceId,
            elevation: data.elevation,
            datetime: data.datetime.toISOString(),
            period: data.period,
            value: data.value,
            flag: data.flag,
            comment: data.comment,
        })
        );

        return dtos;
    }

    public async findObsLog(queryDto: ViewObservationLogQueryDto): Promise<ViewObservationLogDto[]> {

        const entity: ObservationEntity | null = await this.observationRepo.findOneBy({
            stationId: queryDto.stationId,
            elementId: queryDto.elementId,
            sourceId: queryDto.sourceId,
            period: queryDto.period,
            datetime: new Date(queryDto.datetime)
        });

        if (!entity) {
            throw new NotFoundException('Observation not found');
        }

        console.log("entity log: ", entity.log, " type of: ", typeof entity.log);

        let log: ViewObservationLogDto[] = [];

        if (entity.log) {
            log = entity.log.map(item => {
                const logObj: ViewObservationLogDto = {
                    value: item.value,
                    flag: item.flag,
                    final: item.final,
                    comment: item.comment,
                    deleted: item.deleted,
                    entryDateTime: item.entryDateTime,
                }
                return logObj;

            })

        }

        // Include the current values as log.
        // Important because present values should be part of the record history
        const currentValuesAsLogObj: ViewObservationLogDto = {
            value: entity.value,
            flag: entity.flag,
            final: entity.final,
            comment: entity.comment,
            deleted: entity.deleted,
            entryDateTime: entity.entryDateTime.toISOString()
        }

        log.push(currentValuesAsLogObj);

        return log;
    }

    public async save(createObservationDtoArray: CreateObservationDto[], userId: number): Promise<void> {
        let startTime = new Date().getTime();

        const obsEntities: Partial<ObservationEntity>[] = [];
        for (const dto of createObservationDtoArray) {

            const entity: ObservationEntity = this.observationRepo.create({
                stationId: dto.stationId,
                elementId: dto.elementId,
                sourceId: dto.sourceId,
                elevation: dto.elevation,
                datetime: new Date(dto.datetime),
                period: dto.period,
                // Values from duckdb come with floating point precision issue (e.g 1.005 being 1.004999)
                // So adjust the value with the EPSILON then round of to 4 d.p
                // TODO. Should we always limit values to 4 d.p? Do we have climate and hydrology observations that have more than 4 d.p?
                // TODO. Investigate how to deal with this issue.
                value: dto.value === null ? null : NumberUtils.roundOff(dto.value, 1),
                flag: dto.flag,
                qcStatus: QCStatusEnum.NO_QC_TESTS_DONE,
                comment: dto.comment,
                final: false,
                entryUserId: userId,
                // TODO. Write a validator to make sure that either value or flag should be present 
                deleted: (dto.value === null && dto.flag === null),
                entryDateTime: new Date(), // Will be sent to database in utc, that is, new Date().toISOString()               
            });

            obsEntities.push(entity);
        }


        console.log("DTO transformation took: ", new Date().getTime() - startTime);

        startTime = new Date().getTime();

        const batchSize = 1000; // bacthsize of 1000 seems to be safer (incase there are comments) and faster.
        for (let i = 0; i < obsEntities.length; i += batchSize) {
            const batch = obsEntities.slice(i, i + batchSize);
            await this.insertOrUpdateObsValues(batch);
        }
        console.log("Saving entities took: ", new Date().getTime() - startTime);
    }

    private async insertOrUpdateObsValues(observationsData: Partial<ObservationEntity>[]): Promise<void> {
        await this.observationRepo
            .createQueryBuilder()
            .insert()
            .into(ObservationEntity)
            .values(observationsData)
            .orUpdate(
                ["value", "flag", "qc_status", "final", "comment", "deleted", "entry_user_id"],
                ["station_id", "element_id", "source_id", "elevation", "date_time", "period"],
                {
                    skipUpdateIfNoValuesChanged: true,
                }
            )
            .execute();
    }

    public async softDelete(obsDtos: DeleteObservationDto[],  userId: number): Promise<number> {
       return this.softDeleteOrRestore(obsDtos, true, userId)
    }

    public async restore(obsDtos: DeleteObservationDto[],  userId: number): Promise<number> {
        return this.softDeleteOrRestore(obsDtos, false, userId)
     }

    private async softDeleteOrRestore(obsDtos: DeleteObservationDto[], deleteObs: boolean, userId: number): Promise<number> {
        let succesfulChanges: number = 0;
        for (const dto of obsDtos) {
            const updateResult =await this.observationRepo
                .createQueryBuilder()
                .update(ObservationEntity)
                .set({
                    deleted: deleteObs,
                    entryUserId: userId
                }).where('station_id = :station_id', { station_id: dto.stationId })
                .andWhere('element_id = :element_id', { element_id: dto.elementId })
                .andWhere('source_id = :source_id', { source_id: dto.sourceId })
                .andWhere('elevation = :elevation', { elevation: dto.elevation })
                .andWhere('date_time = :date_time', { date_time: dto.datetime })
                .andWhere('period = :period', { period: dto.period })
                .execute();

                console.log('updateResult', updateResult)
                succesfulChanges = succesfulChanges + 1;
        }
        return succesfulChanges;
    }

    public async hardDelete(deleteObsDtos: DeleteObservationDto[]): Promise<number> {
        let succesfulChanges: number = 0;
        for (const dto of deleteObsDtos) {
            const deleteResult = await this.observationRepo.createQueryBuilder()
                .delete()
                .from(ObservationEntity)
                .where('station_id = :station_id', { key1: dto.stationId })
                .andWhere('element_id = :element_id', { key2: dto.elementId })
                .andWhere('source_id = :source_id', { key2: dto.sourceId })
                .andWhere('elevation = :elevation', { key2: dto.elevation })
                .andWhere('date_time = :date_time', { key2: dto.datetime })
                .andWhere('period = :period', { key2: dto.period })
                .execute();

            console.log('deleteResult', deleteResult)
            succesfulChanges = succesfulChanges + 1;
        }

return succesfulChanges;
    }



}
