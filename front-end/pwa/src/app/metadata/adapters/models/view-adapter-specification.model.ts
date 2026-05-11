import { AdapterLanguageEnum } from './adapter-language.enum';

export interface ViewAdapterSpecificationModel {
    id: number;
    name: string;
    description: string;
    language: AdapterLanguageEnum;
    scriptDirName: string;
    entryPoint: string;
    disabled: boolean;
    comment: string | null;
}
