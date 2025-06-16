export enum QCTestTypeEnum {
    RANGE_THRESHOLD = "range_threshold",
    REPEATED_VALUE = "repeated_value", // checks whether the same value occurs at a specific time (e.g., the same hour each day) across a specified number of consecutive records. 
    FLAT_LINE = "flat_line", // Checks if the observed value remains constant over a predefined number of consecutive records.
    SPIKE = "spike", // Detects if the difference between consecutive values exceeds a specified threshold, flagging sudden and unlikely jumps in data    
    RELATIONAL_COMPARISON = "relational_comparison",
    DIURNAL = "diurnal",// for instance, temperatures rise during the day (after sunrise) and fall at night (after sunset)
    CONTEXTUAL_CONSISTENCY = "contextual_consistency",
    REMOTE_SENSING_CONSISTENCY = "remote_sensing_consistency",
    SPATIAL_CONSISTENCY = "spatial_consistency" // using neigbouring stations
} 