import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { QCTestTypeEnum } from '../../entities/qc-test-type.enum';
import { Type } from 'class-transformer';
import { FlatLineQCTestParametersDto } from './qc-test-parameters/flat-line-qc-test-params.dto';
import { RangeThresholdQCTestParamsDto } from './qc-test-parameters/range-qc-test-params.dto';
import { BadRequestException } from '@nestjs/common';
import { SpikeQCTestParamsDto } from './qc-test-parameters/spike-qc-test-params.dto';
import { RelationalQCTestParamsDto } from './qc-test-parameters/relational-qc-test-params.dto';
import { ContextualQCTestParamsDto } from './qc-test-parameters/contextual-qc-test-params.dto';
import { DiurnalQCTestParamsDto } from './qc-test-parameters/diurnal-qc-test-params.dto';
import { RemoteSensingQCTestParamsDto } from './qc-test-parameters/remote-sensing-qc-test-params.dto';
import { SpatialQCTestParamsDto } from './qc-test-parameters/spatial-qc-test-params.dto';

export interface QCTestParametersValidity {
    isValid(): boolean;
}

export class CreateElementQCTestDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description: string | null;

    @IsInt()
    elementId: number;

    @IsInt()
    observationLevel: number;

    @IsInt()
    observationInterval: number;

    @IsEnum(QCTestTypeEnum, { message: 'quality control test type must be a valid QualityControlTestTypeEnum value' })
    qcTestType: QCTestTypeEnum;

    @ValidateNested()
    @Type((options) => {
        const object = options?.newObject;
        if (!object?.qcTestType) {
            throw new BadRequestException('qcTestType is required for determining parameters type');
        }

        switch (object.qcTestType) {
            case QCTestTypeEnum.RANGE_THRESHOLD:
                return RangeThresholdQCTestParamsDto;
            case QCTestTypeEnum.FLAT_LINE:
                return FlatLineQCTestParametersDto;
            case QCTestTypeEnum.SPIKE:
                return SpikeQCTestParamsDto;
            case QCTestTypeEnum.RELATIONAL_COMPARISON:
                return RelationalQCTestParamsDto;
            case QCTestTypeEnum.DIURNAL:
                return DiurnalQCTestParamsDto;
            case QCTestTypeEnum.CONTEXTUAL_CONSISTENCY:
                return ContextualQCTestParamsDto;
            case QCTestTypeEnum.REMOTE_SENSING_CONSISTENCY:
                return RemoteSensingQCTestParamsDto;
            case QCTestTypeEnum.SPATIAL_CONSISTENCY:
                return SpatialQCTestParamsDto;
            default:
                throw new BadRequestException('qcTestType is not recognised');
        }
    })
    parameters: QCTestParametersValidity;

    @IsBoolean()
    disabled: boolean;

    @IsOptional() // TODO. Not sure if this correctly represent nulls
    @IsString()
    comment: string | null;
}

