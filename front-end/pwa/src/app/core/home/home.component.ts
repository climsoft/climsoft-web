import { Component, OnInit } from '@angular/core';
import { ViewPortSize, ViewportService } from 'src/app/core/services/viewport.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  public bOpenSideNav: boolean = false;

  //holds the features navigation items
  public featuresNavItems: any[] = [
    {
      name: 'Dashboard',
      url: '/dashboard',
      icon: 'bi bi-sliders',
      open: false,
      children: []
    },
    {
      name: 'Data Entry',
      url: '/dataentry',
      icon: 'bi bi-file-earmark-text',
      open: false,
      children: [
        {
          name: 'Forms',
          url: '/station-selection',
          featureTitle: 'Data Entry'
        },
        {
          name: 'Import',
          url: '/import-entry',
          featureTitle: 'Import Data'
        }
      ]
    },

    {
      name: 'Metadata',
      url: '/metadata',
      icon: 'bi bi-chat-dots',
      open: false,
      children: [
        {
          name: 'Stations',
          url: '/stations',
          featureTitle: 'Stations'
        },
        {
          name: 'Forms',
          url: '/forms',
          featureTitle: 'Entry Forms'
        }
      ]
    },
    {
      name: 'User Management',
      url: '/usermanagement',
      icon: 'bi bi-people',
      open: false,
      children: []
    }


  ]

  constructor(private viewPort: ViewportService) {

    this.viewPort.viewPortSize.subscribe((viewPortSize) => {
      this.bOpenSideNav = viewPortSize === ViewPortSize.Large;
    });

  }

  ngOnInit() {
  }







}
