import { IsInt, IsOptional } from "class-validator";
import { QCTestParametersValidity } from "../create-qc-test.dto";

export class RepeatedValueQCTestParamsDto implements QCTestParametersValidity {
    @IsInt() // TODO. validate minimum of 2 only because "consecutive" implies at least two or more events or periods.
    consecutiveRecords: number;  // Number of consecutive records required for the test

    @IsOptional() // TODO. Validate the structure when it is provided
    excludeRange?: { // Optional exclude range for values to be excluded from the test
        lowerThreshold: number, // Lower bound of the exclusion range
        upperThreshold: number  // Upper bound of the exclusion range
    }

    isValid(): boolean {
        //TODO
        return true;
    }
}

