
export class CreateImportSourceDTO<T extends object> {
    format: 'TABULAR | JSON';
    configuration: T | null;
}