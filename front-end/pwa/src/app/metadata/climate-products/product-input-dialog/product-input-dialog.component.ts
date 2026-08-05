import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { ConfirmationDialogComponent } from 'src/app/shared/controls/confirmation-dialog/confirmation-dialog.component';
import { CreateUpdateProductModel, ViewProductModel } from 'src/app/data-monitoring/products/models/view-product.model';
import { ProductsService } from 'src/app/data-monitoring/products/services/products.service';

@Component({
  selector: 'app-product-input-dialog',
  templateUrl: './product-input-dialog.component.html',
  styleUrls: ['./product-input-dialog.component.scss']
})
export class ProductInputDialogComponent {
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: ConfirmationDialogComponent;
  @Output() public ok = new EventEmitter<void>();

  protected open!: boolean;
  protected title: 'Edit Product' | 'New Product' = 'New Product';
  protected product!: ViewProductModel;

  constructor(
    private productsService: ProductsService,
    private pagesDataService: PagesDataService,
  ) { }

  public openDialog(productId?: number): void {
    if (productId) {
      this.title = 'Edit Product';
      this.productsService.findOne(productId).pipe(take(1)).subscribe(res => {
        this.product = res;
        this.open = true;
      });
    } else {
      this.title = 'New Product';
      this.product = {
        id: 0,
        systemKey: null,
        supersetUuid: '',
        name: '',
        description: null,
        category: null,
        disabled: false,
      };
      this.open = true;
    }
  }

  protected onOkClick(): void {
    if (!this.product.supersetUuid) {
      this.pagesDataService.showToast({ title: 'Climate Product', message: 'Superset UUID required', type: ToastEventTypeEnum.ERROR });
      return;
    }
    if (!this.product.name) {
      this.pagesDataService.showToast({ title: 'Climate Product', message: 'Name required', type: ToastEventTypeEnum.ERROR });
      return;
    }

    const dto: CreateUpdateProductModel = {
      supersetUuid: this.product.supersetUuid,
      name: this.product.name,
      description: this.product.description || null,
      category: this.product.category || null,
      disabled: this.product.disabled,
    };

    if (this.title === 'New Product') {
      this.productsService.create(dto).pipe(take(1)).subscribe({
        next: (data) => {
          this.pagesDataService.showToast({ title: 'Climate Product', message: `${data.name} created`, type: ToastEventTypeEnum.SUCCESS });
          this.ok.emit();
          this.open = false;
        },
        error: (err) => {
          this.pagesDataService.showToast({ title: 'Climate Product', message: err.error?.message || 'Failed to save', type: ToastEventTypeEnum.ERROR });
        }
      });
    } else {
      this.productsService.update(this.product.id, dto).pipe(take(1)).subscribe({
        next: (data) => {
          this.pagesDataService.showToast({ title: 'Climate Product', message: `${data.name} updated`, type: ToastEventTypeEnum.SUCCESS });
          this.ok.emit();
          this.open = false;
        },
        error: (err) => {
          this.pagesDataService.showToast({ title: 'Climate Product', message: err.error?.message || 'Failed to save', type: ToastEventTypeEnum.ERROR });
        }
      });
    }
  }

  protected onDelete(): void {
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    this.productsService.deleteProduct(this.product.id).pipe(take(1)).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Climate Product', message: 'Product deleted', type: ToastEventTypeEnum.SUCCESS });
        this.open = false;
        this.ok.emit();
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'Climate Product', message: err.error?.message || 'Failed to delete', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onCancelClick(): void {
    this.open = false;
  }
}
