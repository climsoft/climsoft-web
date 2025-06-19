import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { AppAuthService } from 'src/app/app-auth.service';
import { ViewElementQCTestModel } from 'src/app/core/models/elements/qc-tests/view-element-qc-test.model';
import { ElementCacheModel } from '../../services/elements-cache.service';
import { ElementQCTestCacheModel, ElementsQCTestsCacheService } from '../../services/elements-qc-tests-cache.service';

interface ViewQCTest extends ViewElementQCTestModel {
  formattedQCTestTypeName: string,
  formattedParameters: string;
  formattedObsInterval: string;
}

@Component({
  selector: 'app-element-qc-tests',
  templateUrl: './element-qc-tests.component.html',
  styleUrls: ['./element-qc-tests.component.scss']
})
export class ElementQCTestsComponent implements OnChanges, OnDestroy {
  @Input()
  public element!: ElementCacheModel;

  protected qcTests!: ElementQCTestCacheModel[];
  protected userIsSystemAdmin: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private elementQcTestsCacheService: ElementsQCTestsCacheService,
    private appAuthService: AppAuthService,) {
    this.appAuthService.user.pipe(
      take(1),
    ).subscribe(user => {
      this.userIsSystemAdmin = user && user.isSystemAdmin ? true : false;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.element) {
      this.loaQCTests();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loaQCTests(): void {
    this.elementQcTestsCacheService.findByElement(this.element.id).pipe(
      takeUntil(this.destroy$),
    ).subscribe(data => {
      this.qcTests = data ;
    });
  }

 

}
