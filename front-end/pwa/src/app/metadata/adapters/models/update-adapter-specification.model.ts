export interface UpdateAdapterSpecificationModel {
    name: string;
    description: string;
    /** UUID from upload-preview. Omit to keep the current version. */
    scriptDirName: string;
    entryPoint: string;
    disabled: boolean;
    comment: string | null;
}
