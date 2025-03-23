import { AfterViewInit, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { booleanPointInPolygon, multiPolygon, point } from '@turf/turf';
import * as echarts from 'echarts';
import { Subject, take, takeUntil } from 'rxjs';
import { ViewNetworkAffiliatioModel } from 'src/app/metadata/network-affiliations/models/view-network-affiliation.model';
import { NetworkAffiliationsCacheService } from 'src/app/metadata/network-affiliations/services/network-affiliations-cache.service';
import { ViewOrganisationModel } from 'src/app/metadata/organisations/models/view-organisation.model';
import { OrganisationsCacheService } from 'src/app/metadata/organisations/services/organisations-cache.service';
import { ViewRegionModel } from 'src/app/metadata/regions/models/view-region.model';
import { RegionsCacheService } from 'src/app/metadata/regions/services/regions-cache.service';
import { StationCacheModel, StationsCacheService } from 'src/app/metadata/stations/services/stations-cache.service';
import { StationNetworkAffiliationsService } from '../../services/station-network-affiliations.service';
import { StationCountPerNetworkAffiliationCount } from '../../models/station-count-per-network-affiliation-count';
import { StationStatusEnum } from '../../models/station-status.enum';

interface DistributionView {
  name: string;
  value: number;
}

@Component({
  selector: 'app-view-stations-tree-map',
  templateUrl: './view-stations-tree-map.component.html',
  styleUrls: ['./view-stations-tree-map.component.scss']
})
export class ViewStationsTreeMapComponent implements AfterViewInit, OnDestroy {
  private stations!: StationCacheModel[];
  private filteredStations!: StationCacheModel[];
  protected operationalOnly: boolean = true;
  private regions!: ViewRegionModel[];
  private organisations!: ViewOrganisationModel[];
  private networkAffiliations!: ViewNetworkAffiliatioModel[];
  private stationCountPerNetworkAffiliationCount!: StationCountPerNetworkAffiliationCount[];
  private visualiseOption: string = 'Regions';;
  private chartInstance!: echarts.ECharts;

  private destroy$ = new Subject<void>();

  constructor(
    private stationsCacheService: StationsCacheService,
    private regionsService: RegionsCacheService,
    private organisationsService: OrganisationsCacheService,
    private networkAffiliationsService: NetworkAffiliationsCacheService,
    private stationNetworkAffiliationsService: StationNetworkAffiliationsService,
  ) {

    this.stationsCacheService.cachedStations.pipe(
      takeUntil(this.destroy$),
    ).subscribe(stations => {
      this.stations = stations;
      this .filterStations();
    });

    this.regionsService.cachedRegions.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.regions = data;
    });

    this.organisationsService.cachedOrganisations.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.organisations = data;
    });

    this.networkAffiliationsService.cachedNetworkAffiliations.pipe(
      takeUntil(this.destroy$),
    ).subscribe((data) => {
      this.networkAffiliations = data;
    });

    this.stationNetworkAffiliationsService.getStationCountPerNetworkAffiliation().pipe(
      take(1),
    ).subscribe((data) => {
      this.stationCountPerNetworkAffiliationCount = data;
    });

  }

  ngAfterViewInit(): void {
    this.chartInstance = echarts.init(document.getElementById('treemapChart')!);
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  }

  private filterStations(): void{
    this.filteredStations = this.operationalOnly ? this.stations.filter(station => station.status === StationStatusEnum.OPERATIONAL) : this.stations; 
  }

  protected onOperationalFilter(operationalOnly: boolean) {
    this.operationalOnly = operationalOnly;
    this.filterStations()
    this.visualiseChange();
  }

  protected onVisualiseChange(visualiseOption: string): void {
    this.visualiseOption = visualiseOption;
    this.visualiseChange();
  }
  protected visualiseChange(): void {
    let data: DistributionView[] = [];
    switch (this.visualiseOption) {
      case 'Regions':
        data = this.getRegionsDistribution();
        break;
      case 'Organisations':
        data = this.getOrganisationsDistribution();
        break;
      case 'Network Affiliations':
        data = this.getNetworkAffiliationsDistribution();
        break;
      default:
        break;
    }

    this.setTreeMapOption(data);
  }

  private getRegionsDistribution(): DistributionView[] {
    const data: DistributionView[] = [];
    for (const region of this.regions) {
      let value: number = 0;
      for (const station of this.filteredStations) {
        if (!station.location) continue;
        if (this.isStationInRegion(station.location, region.boundary)) {
          value = value + 1;
        }
      }
      data.push({ name: region.name, value: value });
    }
    return data
  }

  public isStationInRegion(location: { longitude: number; latitude: number; }, boundary: number[][][][]): boolean {
    const stationPoint = point([location.longitude, location.latitude]);
    const regionPolygon = multiPolygon(boundary);
    return booleanPointInPolygon(stationPoint, regionPolygon);
  }

  private getOrganisationsDistribution(): DistributionView[] {
    const data: DistributionView[] = [];
    for (const organisation of this.organisations) {
      let value: number = 0;
      for (const station of this.filteredStations) {
        if (station.organisationId === organisation.id) {
          value = value + 1;
        }
      }

      data.push({ name: organisation.name, value: value });
    }
    return data
  }

  private getNetworkAffiliationsDistribution(): DistributionView[] {
    const data: DistributionView[] = [];
    for (const stationCountPerNetwork of this.stationCountPerNetworkAffiliationCount) {
      const networkAffiliation = this.networkAffiliations.find(item => item.id === stationCountPerNetwork.networkAffiliationId);
      if (networkAffiliation) {
        data.push({ name: networkAffiliation.name, value: stationCountPerNetwork.stationCount });
      }
    }
    return data
  }

  private setTreeMapOption(data: DistributionView[]): void {
    const option = {
      tooltip: {
        formatter: '{b}: {c} stations'
      },
      series: [
        {
          type: 'treemap',
          data: data,
          label: {
            show: true,
            formatter: '{b}'
          }
        }
      ]
    };

    this.chartInstance.setOption(option);
  }

}
