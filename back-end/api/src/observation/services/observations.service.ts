import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindManyOptions, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ObservationEntity, UpdateObservationValuesLogVo } from '../entities/observation.entity';
import { CreateObservationDto } from '../dtos/create-observation.dto';
import { ViewObservationQueryDTO } from '../dtos/view-observation-query.dto';
import { ObjectUtils } from 'src/shared/utils/object.util';
import { ElementsService } from 'src/metadata/services/elements/elements.service';
import { SourcesService } from 'src/metadata/services/sources/sources.service';
import { ViewObservationDto } from '../dtos/view-observation.dto';
import { StationsService } from 'src/metadata/services/stations/stations.service';
import { QCStatusEnum } from '../enums/qc-status.enum';
import { CreateObservationQueryDto } from '../dtos/create-observation-query.dto';
import { ViewObservationLogQueryDto } from '../dtos/view-observation-log-query.dto';
import { ViewObservationLogDto } from '../dtos/view-observation-log.dto';

@Injectable()
export class ObservationsService {

    constructor(@InjectRepository(ObservationEntity) private readonly observationRepo: Repository<ObservationEntity>,
        private readonly stationsService: StationsService,
        private readonly elementsService: ElementsService, private readonly sourcesService: SourcesService,
    ) { }


    public async findProcessed(selectObsevationDto: ViewObservationQueryDTO): Promise<ViewObservationDto[]> {

        const obsView: ViewObservationDto[] = [];

        const obsEntities = await this.findProcessedObs(selectObsevationDto);

        const stationEntities = await this.stationsService.findStations();
        const elementEntities = await this.elementsService.findElements();
        const sourceEntities = await this.sourcesService.findSources();

        for (const obsEntity of obsEntities) {

            const viewObs: ViewObservationDto = new ViewObservationDto();

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

            viewObs.elevation = obsEntity.elevation;
            viewObs.period = obsEntity.period;
            viewObs.datetime = obsEntity.datetime.toISOString();
            viewObs.value = obsEntity.value;
            viewObs.flag = obsEntity.flag;

            obsView.push(viewObs);
        }

        return obsView;

    }


    private async findProcessedObs(selectObsevationDto: ViewObservationQueryDTO) {
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


        if (selectObsevationDto.page && selectObsevationDto.pageSize) {
            findOptions.skip = (selectObsevationDto.page - 1) * selectObsevationDto.pageSize;
            findOptions.take = selectObsevationDto.pageSize
        }

        return this.observationRepo.find(findOptions);


    }

    private setProcessedObsDateFilter(selectObsevationDto: ViewObservationQueryDTO, selectOptions: FindOptionsWhere<ObservationEntity>) {

        if (selectObsevationDto.fromDate && selectObsevationDto.toDate) {

            if (selectObsevationDto.fromDate === selectObsevationDto.toDate) {
                selectOptions.datetime = new Date(selectObsevationDto.fromDate);
            } else {
                selectOptions.datetime = Between(new Date(selectObsevationDto.fromDate), new Date(selectObsevationDto.toDate));
            }

        } else if (selectObsevationDto.fromDate) {
            selectOptions.datetime = MoreThanOrEqual(new Date(selectObsevationDto.fromDate))
        } else if (selectObsevationDto.toDate) {
            selectOptions.datetime = LessThanOrEqual(new Date(selectObsevationDto.toDate))
        }


    }


    public async findRawObs(queryDto: CreateObservationQueryDto): Promise<CreateObservationDto[]> {

        //TODO. Think about elevation

        const entities: ObservationEntity[] = await this.observationRepo.findBy({
            stationId: queryDto.stationId,
            elementId: In(queryDto.elementIds),
            sourceId: queryDto.sourceId,
            period: queryDto.period,
            datetime: In(queryDto.datetimes.map(datetime => new Date(datetime))),
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
            datetime: new Date(queryDto.datetime),
            deleted: false
        });

        if (!entity) {
            throw new NotFoundException('Observation not found');
        }

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


    public async save(createObservationDtoArray: CreateObservationDto[], userId: number) {
        const obsEntities: ObservationEntity[] = [];

        let newEntity: boolean;
        let observationEntity;
        for (const createObservationDto of createObservationDtoArray) {
            newEntity = false;
            observationEntity = await this.observationRepo.findOneBy({
                stationId: createObservationDto.stationId,
                elementId: createObservationDto.elementId,
                sourceId: createObservationDto.sourceId,
                elevation: createObservationDto.elevation,
                datetime: new Date(createObservationDto.datetime),
                period: createObservationDto.period,
            });

            if (observationEntity) {
                const oldChanges: UpdateObservationValuesLogVo = this.getEntityValsAsLogVO(observationEntity);
                const newChanges: UpdateObservationValuesLogVo = this.getObservationLogFromDto(createObservationDto, userId);

                if (ObjectUtils.areObjectsEqual<UpdateObservationValuesLogVo>(oldChanges, newChanges, ["entryUserId", "entryDateTime"])) {
                    continue;
                }

            } else {

                //TODO. Move this validation to a pipe validator
                if(createObservationDto.value === null && createObservationDto.flag === null){
                    continue;
                }

                newEntity = true;
                observationEntity = this.observationRepo.create({
                    stationId: createObservationDto.stationId,
                    elementId: createObservationDto.elementId,
                    sourceId: createObservationDto.sourceId,
                    elevation: createObservationDto.elevation,
                    datetime: createObservationDto.datetime,
                    period: createObservationDto.period,
                });

            }


            this.updateObservationEntity(observationEntity, createObservationDto, userId, newEntity);
            obsEntities.push(observationEntity);
        }

        return this.observationRepo.save(obsEntities);
    }


    private getEntityValsAsLogVO(entity: ObservationEntity): UpdateObservationValuesLogVo {
        return {
            value: entity.value,
            flag: entity.flag,
            final: entity.final,
            comment: entity.comment,
            entryUserId: entity.entryUserId,
            deleted: entity.deleted,
            entryDateTime: entity.entryDateTime.toISOString()
        };
    }

    private getObservationLogFromDto(dto: CreateObservationDto, userId: number): UpdateObservationValuesLogVo {
        return {
            value: dto.value,
            flag: dto.flag,
            final: false,
            comment: dto.comment,
            entryUserId: userId,
            deleted: false,
            entryDateTime: new Date().toISOString()
        };
    }

    private updateObservationEntity(entity: ObservationEntity, dto: CreateObservationDto, userId: number, newEntity: boolean): void {

        // If its a new entity, then no need to set log.
        // If its an existing entity, log the previous values and log(if there was an existing log)
        // Note, log has to be set before updating the new values to the entity, because we are logging previous values.
        entity.log = newEntity ? null : ObjectUtils.getNewLog<UpdateObservationValuesLogVo>(entity.log, this.getEntityValsAsLogVO(entity));

        // Then set the new values
        entity.period = dto.period;
        entity.value = dto.value;
        entity.flag = dto.flag;
        entity.qcStatus = QCStatusEnum.NO_QC_TESTS_DONE;
        entity.comment = dto.comment;
        entity.final = false;
        entity.entryUserId = userId;
        entity.deleted = (entity.value === null && entity.flag === null)
        entity.entryDateTime = new Date();
    }




}
