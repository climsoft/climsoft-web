export enum QCStatusEnum {
    NO_QC_TESTS_DONE = "none", // No QC tests done
    QC_TESTS_DONE_WITH_FAILURES = "partial", // All QC tests done, some failed
    ALL_QC_TESTS_PASSED_OR_ACCEPTED = "passed" // All QC tests done. All passed or some failed but were accepted as passed
}
