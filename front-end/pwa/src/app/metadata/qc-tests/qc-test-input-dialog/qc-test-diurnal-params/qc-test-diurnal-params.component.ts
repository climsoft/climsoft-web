import { Component, Input } from '@angular/core';
import { DiurnalQCTestParamsModel, DiurnalPeriodModel } from 'src/app/metadata/qc-tests/models/qc-test-parameters/diurnal-qc-test-params.model';

@Component({
  selector: 'app-qc-test-diurnal-params',
  templateUrl: './qc-test-diurnal-params.component.html',
  styleUrls: ['./qc-test-diurnal-params.component.scss']
})
export class QCTestDiurnalParamsComponent {
  @Input()
  public diurnalQCTestParameters!: DiurnalQCTestParamsModel;

  protected trendOptions: ('rising' | 'falling')[] = ['rising', 'falling'];

  protected onAddPeriod(): void {
    this.diurnalQCTestParameters.periods.push({
      trend: 'rising',
      startHour: 0,
      endHour: 23,
      tolerance: 0
    });
  }

  protected onRemovePeriod(index: number): void {
    this.diurnalQCTestParameters.periods.splice(index, 1);
  }

  protected onTrendChange(period: DiurnalPeriodModel, trend: string): void {
    period.trend = trend as 'rising' | 'falling';
  }
}
