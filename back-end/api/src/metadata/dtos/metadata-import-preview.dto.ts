import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { DateTimeDefinition } from 'src/metadata/source-specifications/dtos/import-source-tabular-params.dto';

// ─── Shared DTOs ─────────────────────────────────────────────

export class ValueMappingDto {
    @IsString()
    @IsNotEmpty()
    sourceId: string;

    @IsString()
    @IsNotEmpty()
    databaseId: string;
}

export class FieldMappingDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    columnPosition?: number;

    @IsOptional()
    @IsString()
    defaultValue?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ValueMappingDto)
    valueMappings?: ValueMappingDto[];
}

// ─── Station Column Mapping ──────────────────────────────────

export class StationColumnMappingDto {
    @IsInt()
    @Min(1)
    idColumnPosition: number;

    @IsInt()
    @Min(1)
    nameColumnPosition: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    descriptionColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    latitudeColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    longitudeColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    elevationColumnPosition?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    obsProcMethod?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    obsEnvironment?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    obsFocus?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    owner?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    operator?: FieldMappingDto;

    @IsOptional()
    @IsInt()
    @Min(1)
    wmoIdColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    wigosIdColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    icaoIdColumnPosition?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    status?: FieldMappingDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => DateTimeDefinition)
    dateEstablishedDefinition?: DateTimeDefinition;

    @IsOptional()
    @ValidateNested()
    @Type(() => DateTimeDefinition)
    dateClosedDefinition?: DateTimeDefinition;

    @IsOptional()
    @IsInt()
    @Min(1)
    commentColumnPosition?: number;
}

// ─── Element Column Mapping ──────────────────────────────────

export class ElementColumnMappingDto {
    @IsInt()
    @Min(1)
    idColumnPosition: number;

    @IsInt()
    @Min(1)
    abbreviationColumnPosition: number;

    @IsInt()
    @Min(1)
    nameColumnPosition: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    descriptionColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    unitsColumnPosition?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => FieldMappingDto)
    elementType?: FieldMappingDto;

    @IsOptional()
    @IsInt()
    @Min(1)
    entryScaleFactorColumnPosition?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    commentColumnPosition?: number;
}