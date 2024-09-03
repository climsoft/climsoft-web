export enum QCStatusEnum {
    NONE = "none", // No QC tests done
    PASSED = "passed", // All QC tests done. All passed or some failed but were enforced as passed
    FAILED = "failed" // Some QC tests failed
}