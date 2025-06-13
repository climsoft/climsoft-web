export enum QCStatusEnum {
    NONE = 'none', // No QC tests done
    FAILED  = 'failed', // All QC tests done, some failed
    PASSED = 'passed' // All QC tests done. All passed or some failed but were accepted as passed
}
