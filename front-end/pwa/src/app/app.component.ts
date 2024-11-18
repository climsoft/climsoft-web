import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './core/services/users/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  protected userSub!: Subscription;

  constructor(private authService: AuthService, private router: Router, private activatedRoute: ActivatedRoute) { 
  }

  ngOnInit(): void {

    this.userSub = this.authService.user.subscribe(user => {
     
      if(!user){
        // TODO. Check why this is not able to work at the guard interceptor level yet it works at guard (canActivate) level
        this.router.navigate(['../../login', { relativeTo: this.activatedRoute }]);
      }
    });

  }

  ngOnDestroy(): void {
    this.userSub.unsubscribe();
  }
}
