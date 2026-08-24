import { AdapterLanguageEnum } from './adapter-language.enum';

export interface ViewAdapterSpecificationModel {
    id: number;
    systemKey: string | null;
    name: string;
    description: string;
    language: AdapterLanguageEnum;
    scriptDirName: string;
    disabled: boolean;
    comment: string | null;
}
