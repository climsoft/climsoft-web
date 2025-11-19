import { Component, OnDestroy } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { CreateViewElementModel } from 'src/app/metadata/elements/models/create-view-element.model';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ElementsCacheService } from '../services/elements-cache.service';
import { AppAuthService } from 'src/app/app-auth.service';
import { CachedMetadataService } from '../../metadata-updates/cached-metadata.service';
import { OptionEnum } from 'src/app/shared/options.enum';

@Component({
  selector: 'app-view-elements',
  templateUrl: './view-elements.component.html',
  styleUrls: ['./view-elements.component.scss']
})
export class ViewElementsComponent implements OnDestroy {
  protected elements!: CreateViewElementModel[];
  protected searchedIds!: number[];

  protected dropDownItems: OptionEnum[] = [];
  protected optionTypeEnum: typeof OptionEnum = OptionEnum;
  protected isSystemAdmin: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private cachedMetadataService: CachedMetadataService,
    private elementsCacheService: ElementsCacheService,
    private appAuthService: AppAuthService,) {

    this.pagesDataService.setPageHeader('Elements');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
      this.dropDownItems =  [OptionEnum.SORT_BY_ID, OptionEnum.SORT_BY_ABBREVIATION, OptionEnum.SORT_BY_NAME, OptionEnum.DOWNLOAD] 
      if (this.isSystemAdmin) {
        this.dropDownItems.push(OptionEnum.DELETE_ALL);
      }
    });


    this.cachedMetadataService.allMetadataLoaded.pipe(
      takeUntil(this.destroy$),
    ).subscribe(allMetadataLoaded => {
      if (!allMetadataLoaded) return;
      this.elements = [...this.cachedMetadataService.elementsMetadata];
    });

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearchInput(searchedIds: number[]): void {
    this.searchedIds = searchedIds;
    this.elements = this.searchedIds && this.searchedIds.length > 0 ?
      this.cachedMetadataService.elementsMetadata.filter(item => this.searchedIds.includes(item.id)) :
      [...this.cachedMetadataService.elementsMetadata];
  }

  protected onOptionsClick(option: OptionEnum): void {
    switch (option) {
      case OptionEnum.SORT_BY_ID:
        this.elements.sort((a, b) => a.id - b.id);
        break;
      case OptionEnum.SORT_BY_ABBREVIATION:
        this.elements.sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
        break;
      case OptionEnum.SORT_BY_NAME:
        this.elements.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'Delete All':
        this.elementsCacheService.deleteAll().pipe(take(1)).subscribe(data => {
          if (data) {
            this.pagesDataService.showToast({ title: "Elements Deleted", message: `All elements deleted`, type: ToastEventTypeEnum.SUCCESS });
          }
        });
        break;
      default:
        break;
    }
  }

  protected get downloadLink(): string {
    return this.elementsCacheService.downloadLink;
  }

}
