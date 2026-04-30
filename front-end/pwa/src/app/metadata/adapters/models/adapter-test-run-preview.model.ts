import { AdapterLanguageEnum } from './adapter-language.enum';

/**
 * Mirrors `AdapterTestRunPreviewDto` on the backend. The sample file is
 * sent separately as the `file` part of the multipart request.
 */
export interface AdapterTestRunPreviewModel {
    language: AdapterLanguageEnum;
    scriptDirName: string;
    entryPoint: string;
}
