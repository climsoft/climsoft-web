import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { QCTestTypeEnum } from '../../entities/qc-test-type.enum';
import { Transform } from 'class-transformer';
import { StringUtils } from 'src/shared/utils/string.utils';

export class FindQCTestQueryDto {
    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToStringArray(value.toString()) : [])
    @IsEnum(QCTestTypeEnum, { each: true, message: 'quality control test type must be a valid QualityControlTestTypeEnum value' })
    qcTestTypes?: QCTestTypeEnum[] ;

    @IsOptional()
    @Transform(({ value }) => value ? StringUtils.mapCommaSeparatedStringToNumberArray(value.toString()) : [])
    @IsInt({ each: true })
    elementIds?: number[] ;

    @IsOptional()
    @IsInt()
    observationPeriod?: number ;
}