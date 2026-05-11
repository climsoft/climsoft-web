import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEnum, ValidateNested } from 'class-validator';
import { DisseminationServiceEnum } from '../enums/dissemination-service.enum';
import { Wis2BoxExportParametersDto } from './wis2box-export-parameters.dto';

/**
 * Umbrella parameters for exports targeted at an external dissemination
 * service. The `service` field selects which downstream system the export
 * is shaped for; `parameters` is validated against the matching service
 * DTO via the polymorphic @Type callback below.
 */
export type DisseminationServiceParameters = Wis2BoxExportParametersDto;

export class DisseminationExportParametersDto {
    @IsEnum(DisseminationServiceEnum, { message: 'dissemination service must be a valid value' })
    service!: DisseminationServiceEnum;

    @Type((options) => {
        const object = options?.object;
        if (!object?.service) {
            throw new BadRequestException('dissemination service is required for determining parameters type');
        }

        const { service } = object as DisseminationExportParametersDto;

        switch (service) {
            case DisseminationServiceEnum.WIS2BOX:
                return Wis2BoxExportParametersDto;
            default:
                throw new BadRequestException('dissemination service is not recognised');
        }
    })
    @ValidateNested()
    parameters!: DisseminationServiceParameters;
}
