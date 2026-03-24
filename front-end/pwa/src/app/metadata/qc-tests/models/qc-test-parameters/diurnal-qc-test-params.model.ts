export interface DiurnalPeriodModel {
    trend: 'rising' | 'falling';
    startHour: number;  // 0-23
    endHour: number;    // 0-23
    tolerance: number;  // allowed counter-trend deviation
}

export interface DiurnalQCTestParamsModel {
    periods: DiurnalPeriodModel[];
}
