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
      this.pagesDataService.showToast({ title: "Password Change", message: `Empty passwords not allowed`, type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.confirmPassword === "") {
      this.pagesDataService.showToast({ title: "Password Change", message: `Password NOT confirmed`, type: ToastEventTypeEnum.ERROR });
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.pagesDataService.showToast({ title: "Password Change", message: `Passwords DO NOT match`, type: ToastEventTypeEnum.ERROR });
      return;
    }

    this.userService.changeUserPassword({ userId: this.userId, password: this.newPassword }).pipe(
      take(1)
    ).subscribe({
      next: data => {
        this.pagesDataService.showToast({ title: "Password Change", message: `Password for ${this.userEmail} changed`, type: ToastEventTypeEnum.SUCCESS });
       },
       error: err =>{
        this.pagesDataService.showToast({ title: "Password Change", message: err, type: ToastEventTypeEnum.ERROR });
       }
    });


  }
}
