import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { ObservationPeriodPermissionsModel } from '../../models/permissions/user-permission.model';
import { Subject, takeUntil } from 'rxjs';
import { DateUtils } from 'src/app/shared/utils/date.utils';
import { CachedMetadataService } from 'src/app/metadata/metadata-updates/cached-metadata.service';

@Component({
  selector: 'app-edit-user-permissions-duration',
  templateUrl: './edit-user-permissions-duration.component.html',
  styleUrls: ['./edit-user-permissions-duration.component.scss']
})
export class EditUserPermissionsDurationComponent implements OnChanges, OnDestroy {
  @Input() public groupName!: string;
  @Input() public observationPeriod!: ObservationPeriodPermissionsModel | undefined;
  @Output() public observationPeriodChange = new EventEmitter<ObservationPeriodPermissionsModel | undefined>();

  protected selectedOption: 'All' | 'Within' | 'From' | 'Last' = 'All';
  protected within: { fromDate: string, toDate: string } = { fromDate: new Date().toISOString().split('T')[0], toDate: new Date().toISOString().split('T')[0] };
  protected fromDate: string = new Date().toISOString().split('T')[0];
  protected last: { duration: number, durationType: 'days' | 'hours' } = { duration: 31, durationType: 'days' }

  private utcMetadataLoaded: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(private cachedMetadataService: CachedMetadataService) {
    // Get sources 
    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$)
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.utcMetadataLoaded = allMetadataLoaded;
      this.setContentsFromObservationPeriod();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["observationPeriod"]) {
      this.setContentsFromObservationPeriod();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setContentsFromObservationPeriod(): void {
    if (this.observationPeriod && this.utcMetadataLoaded) {
      if (this.observationPeriod.within) {
        this.within.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(this.observationPeriod.within.fromDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
        this.within.toDate = DateUtils.getDatetimesBasedOnUTCOffset(this.observationPeriod.within.toDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
        this.selectedOption = 'Within';
      } else if (this.observationPeriod.fromDate) {
        this.fromDate = DateUtils.getDatetimesBasedOnUTCOffset(this.observationPeriod.fromDate, this.cachedMetadataService.utcOffSet, 'add').split('T')[0];
        this.selectedOption = 'From';
      } else if (this.observationPeriod.last) {
        this.last = this.observationPeriod.last;
        this.selectedOption = 'Last';
      }
    } else {
      this.selectedOption = 'All';
    }
  }

  protected changeObservationPeriod(option: 'All' | 'Within' | 'From' | 'Last'): void {
    this.selectedOption = option;
    this.observationPeriod = undefined;
    if (option === 'Within') {
      // Subtracts the offset to get UTC time if offset is plus and add the offset to get UTC time if offset is minus
      // Note, it's subtraction and NOT addition because this is meant to submit data to the API NOT display it 
      this.observationPeriod = {
        within: {
          fromDate: DateUtils.getDatetimesBasedOnUTCOffset(`${this.within.fromDate}T00:00:00Z`, this.cachedMetadataService.utcOffSet, 'subtract'),
          toDate: DateUtils.getDatetimesBasedOnUTCOffset(`${this.within.toDate}T23:59:00Z`, this.cachedMetadataService.utcOffSet, 'subtract'),
        },
      };

    } else if (option === 'From') {
      this.observationPeriod = {
        fromDate: DateUtils.getDatetimesBasedOnUTCOffset(`${this.fromDate}T00:00:00Z`, this.cachedMetadataService.utcOffSet, 'subtract'),
      };
    } else if (option === 'Last') {
      this.observationPeriod = {
        last: this.last,
      };
    }

    this.observationPeriodChange.emit(this.observationPeriod);
  }

  protected onWithinFromDateChange(fromDate: string): void {
    this.within.fromDate = fromDate;
    this.changeObservationPeriod('Within');
  }

  protected onWithinToDateChange(toDate: string): void {
    this.within.toDate = toDate;
    this.changeObservationPeriod('Within');
  }

  protected onFromDateChange(fromDate: string): void {
    this.fromDate = fromDate;
    this.changeObservationPeriod('From');
  }

  protected onLastDurationChange(duration: number): void {
    this.last.duration = duration;
    this.changeObservationPeriod('Last');
  }

  protected onLastDurationTypeChange(option: string): void {
    if (option === 'Days') {
      this.last.durationType = 'days';
    } else if (option === 'Hours') {
      this.last.durationType = 'hours';
    }

    this.changeObservationPeriod('Last');
  }
}
