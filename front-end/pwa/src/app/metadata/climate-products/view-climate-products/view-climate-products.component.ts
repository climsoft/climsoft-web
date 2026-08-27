import { Component, ViewChild } from '@angular/core';
import { take } from 'rxjs';
import { PagesDataService, ToastEventTypeEnum } from 'src/app/core/services/pages-data.service';
import { PagingParameters } from 'src/app/shared/controls/page-input/paging-parameters';
import { DeleteConfirmationDialogComponent } from 'src/app/shared/controls/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { ToggleDisabledConfirmationDialogComponent } from 'src/app/shared/controls/toggle-disabled-confirmation-dialog/toggle-disabled-confirmation-dialog.component';
import { AppConfigService } from 'src/app/app-config.service';
import { ViewProductModel } from 'src/app/data-monitoring/products/models/view-product.model';
import { ProductsService } from 'src/app/data-monitoring/products/services/products.service';
import { ProductInputDialogComponent } from '../product-input-dialog/product-input-dialog.component';

@Component({
  selector: 'app-view-climate-products',
  templateUrl: './view-climate-products.component.html',
  styleUrls: ['./view-climate-products.component.scss']
})
export class ViewClimateProductsComponent {
  @ViewChild('dlgProductInput') dlgProductInput!: ProductInputDialogComponent;
  @ViewChild('dlgDeleteConfirm') dlgDeleteConfirm!: DeleteConfirmationDialogComponent;
  @ViewChild('dlgToggleDisabled') dlgToggleDisabled!: ToggleDisabledConfirmationDialogComponent;

  protected products: ViewProductModel[] = [];
  protected selectedProduct: ViewProductModel | null = null;
  protected pageInputDefinition: PagingParameters = new PagingParameters();
  protected sortColumn: string = '';
  protected sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private pagesDataService: PagesDataService,
    private productsService: ProductsService,
    private appConfigService: AppConfigService,
  ) {
    this.pagesDataService.setPageHeader('Climate Products');
    this.loadProducts();
  }

  protected loadProducts(): void {
    this.productsService.findAllAdmin().pipe(take(1)).subscribe(products => {
      this.products = products;
      this.applySort();
      this.updatePaging();
    });
  }

  protected get pageItems(): ViewProductModel[] {
    const start = (this.pageInputDefinition.page - 1) * this.pageInputDefinition.pageSize;
    return this.products.slice(start, start + this.pageInputDefinition.pageSize);
  }

  protected onSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applySort();
    this.pageInputDefinition.onFirst();
  }

  protected onNewProductClick(): void {
    this.dlgProductInput.openDialog();
  }

  protected onEditProductClick(product: ViewProductModel): void {
    this.dlgProductInput.openDialog(product.id);
  }

  protected onProductSaved(): void {
    this.loadProducts();
  }

  protected async onOpenSuperset(): Promise<void> {
    const url = await this.appConfigService.getSupersetBaseUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  protected onToggleDisabledClick(product: ViewProductModel, event: Event): void {
    event.stopPropagation();
    this.selectedProduct = product;
    this.dlgToggleDisabled.showDialog();
  }

  protected onToggleDisabledConfirm(): void {
    if (!this.selectedProduct) return;
    const { id, systemKey, ...updateDto } = this.selectedProduct;
    this.productsService.update(id, { ...updateDto, disabled: !updateDto.disabled }).pipe(take(1)).subscribe({
      next: () => {
        const action = !updateDto.disabled ? 'disabled' : 'enabled';
        this.pagesDataService.showToast({ title: 'Climate Product', message: `Product ${action}`, type: ToastEventTypeEnum.SUCCESS });
        this.selectedProduct = null;
        this.loadProducts();
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'Climate Product', message: err.error?.message || 'Something went wrong', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  protected onDeleteClick(product: ViewProductModel, event: Event): void {
    event.stopPropagation();
    this.selectedProduct = product;
    this.dlgDeleteConfirm.openDialog();
  }

  protected onDeleteConfirm(): void {
    if (!this.selectedProduct) return;
    this.productsService.deleteProduct(this.selectedProduct.id).pipe(take(1)).subscribe({
      next: () => {
        this.pagesDataService.showToast({ title: 'Climate Product', message: 'Product deleted', type: ToastEventTypeEnum.SUCCESS });
        this.selectedProduct = null;
        this.loadProducts();
      },
      error: (err) => {
        this.pagesDataService.showToast({ title: 'Climate Product', message: err.error?.message || 'Failed to delete', type: ToastEventTypeEnum.ERROR });
      }
    });
  }

  private applySort(): void {
    if (!this.sortColumn) return;
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    this.products.sort((a, b) =>
      String((a as any)[this.sortColumn] ?? '').localeCompare(String((b as any)[this.sortColumn] ?? '')) * dir
    );
  }

  private updatePaging(): void {
    this.pageInputDefinition = new PagingParameters();
    this.pageInputDefinition.setPageSize(365);
    this.pageInputDefinition.setTotalRowCount(this.products.length);
  }
}
