import { Component, OnDestroy, ViewChild } from '@angular/core';
import { Subject, take, takeUntil } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { RegionsCacheService } from '../services/regions-cache.service';
import { ViewRegionModel } from 'src/app/metadata/regions/models/view-region.model';
import { AppAuthService } from 'src/app/app-auth.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import * as L from 'leaflet';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';

type optionsType = 'Import' | 'Delete All';

@Component({
  selector: 'app-view-regions',
  templateUrl: './view-regions.component.html',
  styleUrls: ['./view-regions.component.scss']
})
export class ViewRegionsComponent implements OnDestroy {
  @ViewChild('dlgDeleteAllConfirm') dlgDeleteAllConfirm!: DeleteConfirmationDialogComponent;

  protected regions: ViewRegionModel[] = [];

  protected optionClicked: optionsType | undefined;
  protected isSystemAdmin: boolean = false;
  protected showMapDialog = false;
  protected regionMapLayerGroup: L.LayerGroup = L.layerGroup();
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  private destroy$ = new Subject<void>();

  constructor(
    private pagesDataService: PagesDataService,
    private appAuthService: AppAuthService,
    private regionsService: RegionsCacheService,
  ) {

    this.pagesDataService.setPageHeader('Regions');

    // Check on allowed options
    this.appAuthService.user.pipe(
      takeUntil(this.destroy$),
    ).subscribe(user => {
      if (!user) return;
      this.isSystemAdmin = user.isSystemAdmin;
    });

    // Get all regions
    this.regionsService.cachedRegions.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.regions = data;
      this.applySort();
      this.updatePaging();
      this.setupMap();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected onSearch(): void {
    // TODO.
  }

  protected onOptionsClicked(option: optionsType): void {
    this.optionClicked = option;
    if (option === 'Delete All') {
      this.dlgDeleteAllConfirm.openDialog();
    }
  }

  protected onDeleteAllConfirm(): void {
    this.regionsService.deleteAll().pipe(take(1)).subscribe(data => {
      this.pagesDataService.showToast({ title: "Regions Deleted", message: `All regions deleted`, type: ToastEventTypeEnum.SUCCESS });
    });
  }

  protected onOptionsDialogClosed(): void {
    this.optionClicked = undefined;
  }

  protected onVisualiseClick(): void {
    this.showMapDialog = true;
  }

  private setupMap(): void {
    this.regionMapLayerGroup = L.layerGroup();
    const regionsFeatureCollection: any = {
      "type": "FeatureCollection",
      "features": this.regions.map(item => {
        return {
          "type": "Feature",
          "properties": {
            "name": item.name,
          },
          "geometry": {
            "type": "MultiPolygon",
            "coordinates": item.boundary
          }
        };
      })
    };

    // TODO.  In future the region types will each have different colors
    L.geoJSON(regionsFeatureCollection, {
      style: { fillColor: 'transparent', color: 'blue', weight: 0.5 },
      onEachFeature: this.onEachRegionFeature,
    }).addTo(this.regionMapLayerGroup);
  }

  private onEachRegionFeature(feature: any, layer: any) {
    layer.bindPopup(`<p>${feature.properties.name} </p>`);
  }

  protected get pageStartIndex(): number {
    return (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
  }

  protected get pageItems(): ViewRegionModel[] {
    return this.regions.slice(this.pageStartIndex, this.pageStartIndex + this.pageInputDefinition.pageSize);
  }

  protected onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
    this.pageInputDefinition.onFirst();
  }

  private applySort(): void {
    if (!this.sortColumn) return;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.regions.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * dir;
    });
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(30);
    this.pageInputDefinition.setTotalRowCount(this.regions.length);
  }

}
