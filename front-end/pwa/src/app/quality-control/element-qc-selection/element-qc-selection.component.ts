import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from 'src/app/metadata/elements/services/elements-cache.service';
import { PerformQCParameters } from '../perform-qc-parameters.model';

type optionsType = 'Order By Id' | 'Order By Name';

interface ElementQCSelection {
  element: CreateViewElementModel;
  qcFails: number;
}

@Component({
  selector: 'app-element-qc-selection',
  templateUrl: './element-qc-selection.component.html',
  styleUrls: ['./element-qc-selection.component.scss']
})
export class ElementQCSelectionComponent implements OnDestroy {
  private allElementQCSelection!: ElementQCSelection[];
  protected elementQCSelections!: ElementQCSelection[];

  protected dropDownItems: optionsType[] = [];
  protected showPerformQCButton: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private elementsCacheService: ElementsCacheService,
    private appAuthService: AppAuthService,
    private router: Router,
    private route: ActivatedRoute,) {

    this.pagesDataService.setPageHeader('Select Element');
    this.dropDownItems = ['Order By Id', 'Order By Name'];

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) {
        throw new Error('User not logged in');
      }

      // Only show edit button if user is admin 
      this.showPerformQCButton = user.isSystemAdmin;
    });

    this.elementsCacheService.cachedElements.pipe(
      takeUntil(this.destroy$),
    ).subscribe(elements => {
      this.allElementQCSelection = elements.map(element => {
        return { element: element, qcFails: 0 };
      });
      this.elementQCSelections = this.allElementQCSelection;
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearchInput(searchedIds: number[]): void {
    this.elementQCSelections = searchedIds && searchedIds.length > 0 ? this.allElementQCSelection.filter(item => searchedIds.includes(item.element.id)) : this.allElementQCSelection;
  }

  protected onOptionsClicked(option: optionsType): void {
    switch (option) {
      case 'Order By Id':
        this.elementQCSelections = [...this.elementQCSelections].sort((a, b) => a.element.id - b.element.id);
        break;
      case 'Order By Name':
        this.elementQCSelections = [...this.elementQCSelections].sort((a, b) => a.element.name.localeCompare(b.element.name));
        break;
      default:
        break;
    }
  }

  protected onCheckElementQC(elementQCSelection: ElementQCSelection): void {
    this.router.navigate(['element-qc-data-checks', elementQCSelection.element.id], { relativeTo: this.route.parent });
  }

  protected onPerformQC(qcParameters: PerformQCParameters): void {
    // TODO
  }

}
