export enum QCStatusEnum {
    NoQCTestsDone = "none", // No QC tests done
    QCTestsDoneWithFailures = "partial", // All QC tests done, some failed
    AllQCTestsPassedOrAccepted = "passed" // All QC tests done. All passed or some failed but were accepted as passed
}
