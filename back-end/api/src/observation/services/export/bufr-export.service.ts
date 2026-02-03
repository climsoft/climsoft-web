import { Injectable, Logger } from '@nestjs/common';
import { BufrExportParametersDto } from 'src/metadata/export-specifications/dtos/bufr-export-parameters.dto';
import { FileIOService } from 'src/shared/services/file-io.service';

@Injectable()
export class BufrExportService {
    private readonly logger = new Logger(BufrExportService.name);

    constructor(
        private fileIOService: FileIOService,
    ) {
    }


    // expected inputFilePathName is the csv file generated from observations export. Example file is `daycli_input.csv`
    // outputFilePathName is the BUFR DayCli intermediate file to be generated. Example file is `daycli_intermediate_output.csv`
    public async generateDayCliIntermediateFile(exportParams: BufrExportParametersDto, inputFilePathName: string, outputFilePathName: string): Promise<void> {

        // TODO. Do the following steps:
        // Using duckdb instance from `fileIOService` read the input file and generate BUFR DayCli intermediate csv file.
        // Use the daycli element mappings of `exportParams.elementMappings` parameter to map the databaseElementId to bufrConverterId`
        // Then use the `BUFR_CONVERTER_SPECIFICATIONS` to get the column names for the bufrConverterId
        // The `element_id` in the `daycli_input.csv` gets mapped to column names using the elementMappings, that is, 
        // databaseElementId is in `daycli_input.csv` column `element_id`
        // bufrConverterId is mapped to column names using `BufrConverterSpecification` in `bufr-converter.mappings.ts`
        // The output file should have columns as per BUFR DayCli specification as shown in the `daycli_intermediate_output.csv`.
        // The element mappings will be pivoted to columns in the output file. Same with their corresponding hour and miinute values, e.g the `precipitation_hour` column in the output file
        // The date_time also needs to be separated to equivalent columns like shown in the `daycli_intermediate_output.csv` example.

      
        await this.fileIOService.duckDb.exec('-- SQL logic to read inputFilePathName, process and generate outputFilePathName goes here');


    }


}