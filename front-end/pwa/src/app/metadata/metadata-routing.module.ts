import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewStationsComponent } from './stations/view-stations/view-stations.component';
import { ViewElementsComponent } from './elements/view-elements/view-elements.component';
import { ElementDetailComponent } from './elements/element-detail/element-detail.component';
import { FormSourceDetailComponent } from './source-templates/form-source-detail/form-source-detail.component';
import { ViewSourcesComponent } from './source-templates/view-sources/view-sources.component';
import { StationDetailComponent } from './stations/station-detail/station-detail.component';
import { ImportSourceDetailComponent } from './source-templates/import-source-detail/import-source-detail.component';
import { ViewRegionsComponent } from './regions/view-regions/view-regions.component';
import { ViewExportTemplatesComponent } from './export-templates/view-export-templates/view-export-templates.component';
import { ExportTemplateDetailComponent } from './export-templates/export-template-detail/export-template-detail.component';
import { ViewConnectorsComponent } from './connectors/view-connectors/view-connectors.component';
import { ViewOrganisationsComponent } from './organisations/view-organisations/view-organisations.component';
import { OrganisationDetailsComponent } from './organisations/organisation-details/organisation-details.component';
import { ViewNetworkAffiliationsComponent } from './network-affiliations/view-network-affiliations/view-network-affiliations.component';
import { NetworkAffiliationDetailsComponent } from './network-affiliations/network-affiliation-details/network-affiliation-details.component';
import { ViewQCTestsComponent } from './qc-tests/view-qc-tests/view-qc-tests.component';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Metadata'
    },
    children: [
      {
        path: '',
        redirectTo: 'view-elements',
        pathMatch: 'full',
      },
      {
        path: 'view-elements',
        component: ViewElementsComponent,
      },
      {
        path: 'element-detail/:id',
        component: ElementDetailComponent
      },
      {
        path: 'view-sources',
        component: ViewSourcesComponent,
      },
      {
        path: 'form-source-detail/:id',
        component: FormSourceDetailComponent
      },
      {
        path: 'import-source-detail/:id',
        component: ImportSourceDetailComponent
      },
      {
        path: 'view-network-affiliations',
        component: ViewNetworkAffiliationsComponent
      },
      {
        path: 'network-affiliation-details/:id',
        component: NetworkAffiliationDetailsComponent
      },
      {
        path: 'view-organisations',
        component: ViewOrganisationsComponent
      },
      {
        path: 'organisation-details/:id',
        component: OrganisationDetailsComponent
      },
      {
        path: 'view-regions',
        component: ViewRegionsComponent
      },
      {
        path: 'view-stations',
        component: ViewStationsComponent,
      },
      {
        path: 'station-detail/:id',
        component: StationDetailComponent
      },
      {
        path: 'view-qc-tests',
        component: ViewQCTestsComponent
      },
      {
        path: 'view-exports',
        component: ViewExportTemplatesComponent
      },
      {
        path: 'export-detail/:id',
        component: ExportTemplateDetailComponent
      },
      {
        path: 'view-connectors',
        component: ViewConnectorsComponent
      },


    ]
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MetadataRoutingModule { }
