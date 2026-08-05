import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ViewProductModel } from '../models/view-product.model';
import { ProductsService } from '../services/products.service';

@Component({
    selector: 'app-product-list',
    templateUrl: './product-list.component.html',
    styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit, OnDestroy {
    protected productsByCategory: { category: string; products: ViewProductModel[] }[] = [];
    protected loading = true;
    protected errorMessage: string | null = null;

    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly productsService: ProductsService,
        private readonly router: Router,
    ) { }

    ngOnInit(): void {
        this.productsService.findAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: products => {
                    this.productsByCategory = this.groupByCategory(products);
                    this.loading = false;
                },
                error: () => {
                    this.errorMessage = 'Failed to load climate products.';
                    this.loading = false;
                },
            });
    }

    protected openProduct(product: ViewProductModel): void {
        this.router.navigate(['/data-monitoring/product-viewer', product.id]);
    }

    private groupByCategory(products: ViewProductModel[]): { category: string; products: ViewProductModel[] }[] {
        const map = new Map<string, ViewProductModel[]>();
        for (const p of products) {
            const key = p.category ?? 'General';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(p);
        }
        return [...map.entries()].map(([category, prods]) => ({ category, products: prods }));
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
