import { AdapterLanguageEnum } from '../enums/adapter-language.enum';

export class ViewAdapterSpecificationDto {
    id!: number;
    systemKey!: string | null;
    name!: string;
    description!: string;
    language!: AdapterLanguageEnum;
    scriptDirName!: string;
    disabled!: boolean;
    comment!: string | null;
}
