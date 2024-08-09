import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator'; 
import { CreateImportTabularSourceDTO } from 'src/metadata/controllers/sources/dtos/create-import-source-tabular.dto';
import { CreateUpdateSourceDto } from 'src/metadata/controllers/sources/dtos/create-update-source.dto';
import { CreateImportSourceDTO, FormatEnum } from '../dtos/create-import-source.dto';


@Injectable()
export class ValidateImportSourcePipe implements PipeTransform {


  // TODO. Modify this pipe to ensure that the generic type is always returned.
  // When its an array expected and was not passed, yet the user is allowed access to stations, return an empty array.
  // This will iprove on consistency.
  public async transform(value: any, metadata: ArgumentMetadata) {

     console.log('Import source pipe',"value: ", value," metadata: ", metadata);

     if (!metadata.metatype || metadata.metatype === CreateUpdateSourceDto) {
      return value;
    }

    const parentObject: CreateUpdateSourceDto<CreateImportSourceDTO> = value as CreateUpdateSourceDto<CreateImportSourceDTO> ;

    if(parentObject.extraMetadata && parentObject.extraMetadata.format && parentObject.extraMetadata.format === FormatEnum.TABULAR){
      const object: CreateUpdateSourceDto<CreateImportTabularSourceDTO> = plainToInstance( CreateUpdateSourceDto<CreateImportTabularSourceDTO>, value);

      const errors = await validate(object);
      if (errors.length > 0) {
        console.log("Import source validation errors: ", errors);
        throw new BadRequestException('Validation failed');
      }
      return value;
    }else{
      throw new BadRequestException('Validation failed');
    }

  
  }



}
