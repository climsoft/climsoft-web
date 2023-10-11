import { Component, OnInit } from '@angular/core';
import { ViewPortSize, ViewportService } from 'src/app/core/services/viewport.service';
import { PagesDataService, ToastEvent } from '../services/pages-data.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {



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
        },
        {
          name: 'View Entries',
          url: '/view-entry',
          featureTitle: 'View Entries'
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
          name: 'Elements',
          url: '/elements',
          featureTitle: 'Elements'
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


  ];

  bOpenSideNav: boolean = false;
  pageHeaderName: string = '';
  toasts: ToastEvent[] = [];

  constructor(private viewPortService: ViewportService, private pagesDataService: PagesDataService) {

    this.viewPortService.viewPortSize.subscribe((viewPortSize) => {
      this.bOpenSideNav = viewPortSize === ViewPortSize.Large;
    });

    this.pagesDataService.pageHeader.subscribe(name => {
      this.pageHeaderName = name;
    });

    this.pagesDataService.toastEvents.subscribe(toast => {
     this.showToast(toast);
    });

  }

  ngOnInit() {
  }

  private showToast(currentToast: ToastEvent ){

    this.toasts.push(currentToast);

    // automatically hide the toast after 3 seconds
    let timeout = 3000;
    setTimeout(() => {
      if(this.toasts.length>0){
        this.toasts.splice(0, 1); //remove the first
      }    
    }, timeout);

  }


}
