import { AdapterLanguageEnum } from "./adapter-language.enum";

export interface UpdateAdapterSpecificationModel {
    name: string;
    description: string;
    language: AdapterLanguageEnum;
    /** UUID from upload-preview. Omit to keep the current version. */
    scriptDirName: string;
    disabled: boolean;
    comment: string | null;
}
