import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AppAuthService } from './app-auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  protected userSub!: Subscription;

  constructor(
    private authService: AppAuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.initialiseUser();
  }

  ngOnDestroy(): void {
    this.userSub.unsubscribe();
  }

  private async initialiseUser() {
    // Set logged in user credentials from local db first. 
    // This makes sure any logged in user is retrived before subscription of user changes
    await this.authService.setLoggedInUserFromLocalDB();

    // Then Create subscription to listen to any log out event or invalidation of user
    this.userSub = this.authService.user.subscribe(user => {
      // TODO. Check why this is not able to work at the guard interceptor level yet can work at guard (canActivate) level 
      if (!user) {
        this.router.navigate(['../../login', { relativeTo: this.activatedRoute }]);
      }
    });
  }
}
