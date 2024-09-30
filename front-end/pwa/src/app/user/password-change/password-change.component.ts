import { Component, Input } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService } from 'src/app/core/services/pages-data.service';
import { UsersService } from 'src/app/core/services/users/users.service';

@Component({
  selector: 'app-password-change',
  templateUrl: './password-change.component.html',
  styleUrls: ['./password-change.component.scss']
})
export class PasswordChangeComponent {

  @Input()
  public userId!: number;

  @Input()
  public userEmail!: string;

  public open: boolean = false;

  protected newPassword: string = '';

  protected confirmPassword: string = '';

  constructor(  private pagesDataService: PagesDataService, private userService: UsersService) {

  }

  protected onOkClick(): void {

    if (this.newPassword === "") {
      return;
    }

    if (this.confirmPassword === "") {
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      return;
    }

    this.userService.changeUserPassword({userId: this.userId, password: this.newPassword}).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: "Password Changed", message: `Password for ${this.userEmail} changed`, type: "success" });
      }
    });


  }
}
