import { Component, Input } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { UsersService } from '../services/users.service';

@Component({
  selector: 'app-password-change',
  templateUrl: './password-change.component.html',
  styleUrls: ['./password-change.component.scss']
})
export class PasswordChangeComponent {
  protected open: boolean = false;
  protected userEmail!: string;
  private userId!: number;
  protected newPassword: string = '';
  protected confirmPassword: string = '';

  constructor(
    private pagesDataService: PagesDataService,
    private userService: UsersService,) {
  }

  public openDialog(userId: number, userEmail: string): void {
    this.userId = userId;
    this.userEmail = userEmail;
    this.open = true;
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

    this.userService.changeUserPassword({ userId: this.userId, password: this.newPassword }).pipe(
      take(1)
    ).subscribe((data) => {
      if (data) {
        this.pagesDataService.showToast({ title: "Password Changed", message: `Password for ${this.userEmail} changed`, type: ToastEventTypeEnum.SUCCESS });
      }
    });


  }
}
