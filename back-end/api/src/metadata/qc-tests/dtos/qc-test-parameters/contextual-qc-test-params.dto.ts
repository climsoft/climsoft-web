import { IsEnum, IsInt, IsNumber, ValidateNested } from "class-validator";
import { QCTestParamConditionEnum } from "./qc-test-param-condition.enum";
import { Type } from "class-transformer";

class ContextualCheckDto {
    @IsEnum(QCTestParamConditionEnum)
    condition: QCTestParamConditionEnum;

    @IsNumber()
    value: number;
}

export class ContextualQCTestParamsDto {
    @IsInt()
    referenceElementId: number;

    @ValidateNested()
    @Type(() => ContextualCheckDto)
    primaryCheck: ContextualCheckDto;

    @ValidateNested()
    @Type(() => ContextualCheckDto)
    referenceCheck: ContextualCheckDto;

}
