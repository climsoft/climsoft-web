import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Router, NavigationEnd, NavigationExtras, Navigation } from '@angular/router';
import { Location } from '@angular/common';
import { filter } from "rxjs/operators";
import { ViewPortSize, ViewportService } from '../modules/shared/services/viewport.service';
import { PagesDataService } from '../modules/shared/services/pages-data.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  @ViewChild(MatSidenav) sideNav!: MatSidenav;
  public componentTitle: string = "";
  public launchedAsSubComponent: boolean = false;
  public activeParentFeatureName: string = "";
  public activeFeatureName: string = "";

  //holds the features navigation items
  public featuresNavItems: any[] = [
    {
      name: 'Data Entry',
      url: '/dataentry',
      icon: 'edit_note',
      children: [
        {
          name: 'Forms',
          url: '/dataentry/formentry',
          featureTitle: 'Data Entry'
        },
        {
          name: 'Import',
          url: '/dataentry/importentry',
          featureTitle: 'Import Data'
        }
      ]
    },

    {
      name: 'Metadata',
      url: '/metadata',
      icon: 'sticky_note_2',
      children: [
        {
          name: 'Stations',
          url: '',
          featureTitle: 'Stations'
        },
        {
          name: 'Forms',
          url: '/metadata/forms',
          featureTitle: 'Entry Forms'
        }
      ]
    },
    {
      name: 'User Management',
      url: '/usermanagement',
      icon: 'how_to_reg',
      children: []
    }


  ]

  constructor(private viewPort: ViewportService,private viewDataService: PagesDataService, private router: Router, private location: Location) {

    this.viewDataService.loadedViewNavigationData.subscribe( (state)=>{
      if (state['viewTitle']) {
        this.componentTitle = state['viewTitle'];
      }
  
      if (state['subView']) {
        this.launchedAsSubComponent = state['subView'];
      } else {
        this.launchedAsSubComponent = false;
      }
    } );


  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.viewPort.viewPortSize.subscribe((viewPortSize) => {
      if (viewPortSize === ViewPortSize.Small) {
        this.sideNav.mode = 'over';
        this.sideNav.close();
      } else {
        this.sideNav.mode = 'side';
        this.sideNav.open();
      }
    });

  }

  public toggleFeaturesNav(): void {
    if (this.sideNav.opened) {
      this.sideNav.close();
    } else {
      this.sideNav.open();
    }
  }


  public onFeatureClick(featureTitle: string, url: string): void {
    if (this.sideNav.mode === 'over') {
      this.sideNav.close();
    }
    this.router.navigate([url], { state: { viewTitle: featureTitle } });
    //todo. loop through to get the active features and highlight accordingly
  }

  public onBackClick(): void {
    this.location.back();
  }





}
