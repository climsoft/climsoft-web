import { AdapterLanguageEnum } from './adapter-language.enum';

/**
 * Mirrors `AdapterTestRunPreviewDto` on the backend. The sample file is
 * sent separately as the `file` part of the multipart request.
 *
 * The entry point is not sent — the API derives it from `language` via the
 * canonical entry-point convention.
 */
export interface AdapterTestRunPreviewModel {
    language: AdapterLanguageEnum;
    scriptDirName: string;
}
