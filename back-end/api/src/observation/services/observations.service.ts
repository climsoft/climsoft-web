import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Equal, FindManyOptions, FindOperator, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ObservationEntity } from '../entities/observation.entity';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { ViewObservationDto } from '../dtos/view-observation.dto';
import { StationsService } from 'src/metadata/stations/services/stations.service';
import { QCStatusEnum } from '../enums/qc-status.enum';
import { EntryFormObservationQueryDto } from '../dtos/entry-form-observation-query.dto';
import { ViewObservationLogQueryDto } from '../dtos/view-observation-log-query.dto';
import { ViewObservationLogDto } from '../dtos/view-observation-log.dto';
import { SourcesService } from 'src/metadata/sources/services/sources.service';
import { ElementsService } from 'src/metadata/elements/services/elements.service';
import { DeleteObservationDto } from '../dtos/delete-observation.dto'; 
import { ClimsoftV4Service } from './climsoft-v4.service';
import { ClimsoftDBUtils } from '../utils/climsoft-db.utils';

@Injectable()
export class ObservationsService {

    constructor(
        @InjectRepository(ObservationEntity) private  observationRepo: Repository<ObservationEntity>,
        private  stationsService: StationsService,
        private  elementsService: ElementsService,
        private  sourcesService: SourcesService,
         private  climsoftV4Service: ClimsoftV4Service,
    ) { }

    public async findProcessed(selectObsevationDto: ViewObservationQueryDTO): Promise<ViewObservationDto[]> {
        const obsView: ViewObservationDto[] = [];
        const obsEntities = await this.findObsEntities(selectObsevationDto);

        // TODO. Remove this because front end caches the metadata.
        // OR Later use inner joins, this will make the loading of metadata redundant. 
        const stationEntities = await this.stationsService.find();
        const elementEntities = await this.elementsService.find();
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
            viewObs.comment = obsEntity.comment;
            viewObs.final = obsEntity.final;
            viewObs.entryDatetime = obsEntity.entryDateTime.toISOString();

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


    private async findObsEntities(viewObsevationQueryDto: ViewObservationQueryDTO): Promise<ObservationEntity[]> {
        // TODO. This is a temporary check. Find out how we can do this at the dto validation level.
        if (!(viewObsevationQueryDto.page && viewObsevationQueryDto.pageSize && viewObsevationQueryDto.pageSize <= 1000)) {
            throw new BadRequestException("You must specify page and page size. Page size must be less than or equal to 1000")
        }

        const findOptions: FindManyOptions<ObservationEntity> = {
            order: {
                stationId: "ASC",
                elementId: "ASC",
                elevation: "ASC",
                period: "ASC",
                datetime: "ASC",
                sourceId: "ASC"
            },
            where: this.getProcessedFilter(viewObsevationQueryDto),
            skip: (viewObsevationQueryDto.page - 1) * viewObsevationQueryDto.pageSize,
            take: viewObsevationQueryDto.pageSize
        };

        return this.observationRepo.find(findOptions);
    }

    public async count(selectObsevationDto: ViewObservationQueryDTO): Promise<number> {
        const whereOptions: FindOptionsWhere<ObservationEntity> = this.getProcessedFilter(selectObsevationDto);
        return this.observationRepo.countBy(whereOptions);
    }

    private getProcessedFilter(selectObsevationDto: ViewObservationQueryDTO): FindOptionsWhere<ObservationEntity> {
        const whereOptions: FindOptionsWhere<ObservationEntity> = {};

        if (selectObsevationDto.stationIds) {
            whereOptions.stationId = selectObsevationDto.stationIds.length === 1 ? selectObsevationDto.stationIds[0] : In(selectObsevationDto.stationIds);
        }

        if (selectObsevationDto.elementIds) {
            whereOptions.elementId = selectObsevationDto.elementIds.length === 1 ? selectObsevationDto.elementIds[0] : In(selectObsevationDto.elementIds);
        }

        if (selectObsevationDto.period) {
            whereOptions.period = selectObsevationDto.period;
        }

        if (selectObsevationDto.elevation !== undefined) {
            whereOptions.elevation = selectObsevationDto.elevation;
        }

        if (selectObsevationDto.sourceIds) {
            whereOptions.sourceId = selectObsevationDto.sourceIds.length === 1 ? selectObsevationDto.sourceIds[0] : In(selectObsevationDto.sourceIds);
        }

        this.setProcessedObsDateFilter(selectObsevationDto, whereOptions);

        whereOptions.deleted = selectObsevationDto.deleted;

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
            dateOperator = MoreThanOrEqual(new Date(selectObsevationDto.fromDate));
        } else if (selectObsevationDto.toDate) {
            dateOperator = LessThanOrEqual(new Date(selectObsevationDto.toDate));
        }

        if (dateOperator !== null) {
            if (selectObsevationDto.useEntryDate) {
                selectOptions.entryDateTime = dateOperator;
            } else {
                selectOptions.datetime = dateOperator;
            }
        }

    }

    public async findRawObs(queryDto: EntryFormObservationQueryDto): Promise<CreateObservationDto[]> {
        const entities: ObservationEntity[] = await this.observationRepo.findBy({
            stationId: queryDto.stationId,
            elementId: In(queryDto.elementIds),
            sourceId: queryDto.sourceId,
            elevation: queryDto.elevation,
            datetime: In(queryDto.datetimes.map(datetime => new Date(datetime))),
            //period: queryDto.period,
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

    // public findEntities(findOptions: FindManyOptions<ObservationEntity>): Promise<ObservationEntity[]> {
    //     return this.observationRepo.find(findOptions);
    // }

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

        //console.log("entity log: ", entity.log, " type of: ", typeof entity.log);

        let log: ViewObservationLogDto[] = [];

        if (entity.log) {
            log = entity.log.map(item => {
                const logObj: ViewObservationLogDto = {
                    value: item.value,
                    flag: item.flag,
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
            comment: entity.comment,
            deleted: entity.deleted,
            entryDateTime: entity.entryDateTime.toISOString()
        }

        log.push(currentValuesAsLogObj);

        return log;
    }

    public async bulkPutOrig(createObservationDtos: CreateObservationDto[], userId: number): Promise<void> {
        let startTime = new Date().getTime();

        const obsEntities: Partial<ObservationEntity>[] = [];
        for (const dto of createObservationDtos) {
            const entity: Partial<ObservationEntity> = this.observationRepo.create({
                stationId: dto.stationId,
                elementId: dto.elementId,
                sourceId: dto.sourceId,
                elevation: dto.elevation,
                datetime: new Date(dto.datetime),
                period: dto.period,
                value: dto.value,
                flag: dto.flag,
                qcStatus: QCStatusEnum.NONE,
                comment: dto.comment,
                final: false,
                entryUserId: userId,
                deleted: false,
                savedToV4: false,
            });

            obsEntities.push(entity);
        }


        console.log("DTO transformation took: ", new Date().getTime() - startTime);

        startTime = new Date().getTime();

        const batchSize = 1000; // batch size of 1000 seems to be safer (incase there are comments) and faster.
        for (let i = 0; i < obsEntities.length; i += batchSize) {
            const batch = obsEntities.slice(i, i + batchSize);
            await this.insertOrUpdateObsValuesOrig(batch);
        }
        console.log("Saving entities took: ", new Date().getTime() - startTime);

        // Save to version 4 database as well
        //this.climsoftV4Service.saveObservationstoV4DB();
    }

    private async insertOrUpdateObsValuesOrig(observationsData: Partial<ObservationEntity>[]): Promise<void> {
        await this.observationRepo
            .createQueryBuilder()
            .insert()
            .into(ObservationEntity)
            .values(observationsData)
            .orUpdate(
                [
                    "value",
                    "flag",
                    "qc_status",
                    "final",
                    "comment",
                    "deleted",
                    "saved_to_v4",
                    "entry_user_id",
                ],
                [
                    "station_id",
                    "element_id",
                    "source_id",
                    "elevation",
                    "date_time",
                    "period",
                ],
                {
                    skipUpdateIfNoValuesChanged: true,
                }
            )
            .execute();
    }

    public async bulkPut(createObservationDtos: CreateObservationDto[], userId: number): Promise<void> {
        let startTime = new Date().getTime();

        const obsEntities: ObservationEntity[] = [];
        for (const dto of createObservationDtos) {
            const entity: ObservationEntity = this.observationRepo.create({
                stationId: dto.stationId,
                elementId: dto.elementId,
                sourceId: dto.sourceId,
                elevation: dto.elevation,
                datetime: new Date(dto.datetime),
                period: dto.period,
                value: dto.value,
                flag: dto.flag,
                qcStatus: QCStatusEnum.NONE,
                comment: dto.comment,
                final: false,
                entryUserId: userId,
                deleted: false,
                savedToV4: false,
            });

            obsEntities.push(entity);
        }


        console.log("DTO transformation took: ", new Date().getTime() - startTime);

        startTime = new Date().getTime();

        const batchSize = 1000; // batch size of 1000 seems to be safer (incase there are comments) and faster.
        for (let i = 0; i < obsEntities.length; i += batchSize) {
            const batch = obsEntities.slice(i, i + batchSize);
            await ClimsoftDBUtils.insertOrUpdateObsValues(this.observationRepo, batch);
        }
        console.log("Saving entities took: ", new Date().getTime() - startTime);

        // Initiate saving to version 4 database as well
         this.climsoftV4Service.saveObservationstoV4DB();
    }

    public async softDelete(obsDtos: DeleteObservationDto[], userId: number): Promise<number> {
        return this.softDeleteOrRestore(obsDtos, true, userId)
    }

    public async restore(obsDtos: DeleteObservationDto[], userId: number): Promise<number> {
        return this.softDeleteOrRestore(obsDtos, false, userId)
    }

    private async softDeleteOrRestore(obsDtos: DeleteObservationDto[], deleteObs: boolean, userId: number): Promise<number> {
        // TODO. Later optimise this. Change it to accomodate batch inserts.
        let succesfulChanges: number = 0;
        for (const dto of obsDtos) {
            const result = await this.observationRepo
                .createQueryBuilder()
                .update(ObservationEntity)
                .set({
                    deleted: deleteObs,
                    entryUserId: userId
                }).where('station_id = :station_id', { station_id: dto.stationId })
                .andWhere('element_id = :element_id', { element_id: dto.elementId })
                .andWhere('elevation = :elevation', { elevation: dto.elevation })
                .andWhere('date_time = :date_time', { date_time: dto.datetime })
                .andWhere('period = :period', { period: dto.period })
                .andWhere('source_id = :source_id', { source_id: dto.sourceId })
                .execute();

            if (result.affected) {
                succesfulChanges = succesfulChanges + 1;
            }

        }
        return succesfulChanges;
    }

    public async hardDelete(deleteObsDtos: DeleteObservationDto[]): Promise<number> {
        // TODO. Later optimise this. Change it to accomodate batch inserts.
        let succesfulChanges: number = 0;
        for (const dto of deleteObsDtos) {
            const result = await this.observationRepo.createQueryBuilder()
                .delete()
                .from(ObservationEntity)
                .where('station_id = :station_id', { station_id: dto.stationId })
                .andWhere('element_id = :element_id', { element_id: dto.elementId })
                .andWhere('elevation = :elevation', { elevation: dto.elevation })
                .andWhere('date_time = :date_time', { date_time: dto.datetime })
                .andWhere('period = :period', { period: dto.period })
                .andWhere('source_id = :source_id', { source_id: dto.sourceId })
                .execute();

            if (result.affected) {
                succesfulChanges = succesfulChanges + 1;
            }
        }

        return succesfulChanges;
    }



}
