import { IsNumber } from "class-validator";

export class SpikeQCTestParamsDto {
    @IsNumber()
    spikeThreshold: number;

}
