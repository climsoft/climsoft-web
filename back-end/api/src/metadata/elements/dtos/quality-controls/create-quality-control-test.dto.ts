import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { QualityControlTestTypeEnum } from '../../enums/quality-control-test-type.enum';

export class CreateQualityControlTestDto {
    @IsEnum(QualityControlTestTypeEnum, { message: 'quality control test type must be a valid QualityControlTestTypeEnum value' })
    qcTestTypeId: QualityControlTestTypeEnum;

    @IsInt()
    elementId: number;

    @IsOptional() // TODO. Not sure if this correctly represent nulls
    @IsInt()
    period: number | null;

    @IsOptional() // TODO. Temporary until we implement validate nested
    parameters: QCTestParametersValidity;

    @IsBoolean()
    realTime: boolean;

    @IsBoolean()
    disabled: boolean;

    @IsOptional() // TODO. Not sure if this correctly represent nulls
    @IsString()
    comment: string | null;
}

export interface QCTestParametersValidity{
    isValid(): boolean;
  }