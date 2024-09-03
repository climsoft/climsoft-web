import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { QCTestTypeEnum } from '../../entities/qc-test-type.enum';

export class CreateQCTestDto {
    @IsEnum(QCTestTypeEnum, { message: 'quality control test type must be a valid QualityControlTestTypeEnum value' })
    qcTestType: QCTestTypeEnum;

    @IsInt()
    elementId: number;

    @IsOptional() // TODO. Not sure if this correctly represent nulls
    @IsInt()
    observationPeriod: number | null;

    @IsOptional() // TODO. Temporary until we implement validate nested
    parameters: QCTestParametersValidity;

    @IsBoolean()
    disabled: boolean;

    @IsOptional() // TODO. Not sure if this correctly represent nulls
    @IsString()
    comment: string | null;
}

export interface QCTestParametersValidity{
    isValid(): boolean;
  }