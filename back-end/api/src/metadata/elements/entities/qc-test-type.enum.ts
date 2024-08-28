export enum QCTestTypeEnum {
    RANGE_THRESHOLD = "range_threshold",
    FLAT_LINE = "flat_line", // Checks if the observed value remains constant over a predefined number of consecutive records.
    SPIKE = "spike", // Detects if the difference between consecutive values exceeds a specified threshold, flagging sudden and unlikely jumps in data  
    REPEATED_VALUE = "repeated_value", // checks whether the same value occurs at a specific time (e.g., the same hour each day) across a specified number of consecutive records. 
    RELATIONAL_COMPARISON = "relational",
    DIFFERENCE_THRESHOLD = "difference_threshold",
    SUMMATION_THRESHOLD = "summation_threshold",
    DIURNAL = "diurnal",// for instance, temperatures rise during the day (after sunrise) and fall at night (after sunset)
    CONTEXTUAL_CONSISTENCY = "contextual_consistency",
    REMOTE_SENSING_CONSISTENCY = "remote_sensing_consistency",
    SPATIAL_CONSISTENCY = "spatial_consistency" // using neigbouring stations
}