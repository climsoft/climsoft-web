import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { embedDashboard } from '@superset-ui/embedded-sdk';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppConfigService } from 'src/app/app-config.service';
import { ViewProductModel } from '../models/view-product.model';
import { ProductsService } from '../services/products.service';

@Component({
    selector: 'app-product-viewer',
    templateUrl: './product-viewer.component.html',
    styleUrls: ['./product-viewer.component.scss'],
})
export class ProductViewerComponent implements OnInit, OnDestroy {
    @ViewChild('dashboardContainer', { static: true }) container!: ElementRef<HTMLDivElement>;

    protected product: ViewProductModel | null = null;
    protected loading = true;
    protected errorMessage: string | null = null;

    private readonly destroy$ = new Subject<void>();
    private productId!: number;

    constructor(
        private readonly route: ActivatedRoute,
        private readonly productsService: ProductsService,
        private readonly appConfigService: AppConfigService,
    ) { }

    ngOnInit(): void {
        this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
            this.productId = +params['id'];
            this.initEmbed();
        });
    }

    private initEmbed(): void {
        this.loading = true;
        this.errorMessage = null;

        // Fetch initial token and dashboard UUID in one call, then start embedding
        this.productsService.getGuestToken(this.productId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ token: initialToken, supersetUuid }) => {
                    this.productsService.findOne(this.productId)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe({
                            next: product => {
                                this.product = product;
                                this.embed(supersetUuid, initialToken);
                            },
                            error: () => this.showError(),
                        });
                },
                error: () => this.showError(),
            });
    }

    private embed(supersetUuid: string, initialToken: string): void {
        let firstToken = true;

        embedDashboard({
            id: supersetUuid,
            supersetDomain: this.appConfigService.supersetBaseUrl,
            mountPoint: this.container.nativeElement,
            fetchGuestToken: () => {
                if (firstToken) {
                    firstToken = false;
                    return Promise.resolve(initialToken);
                }
               return firstValueFrom(this.productsService.getGuestToken(this.productId))
                .then(r => r!.token);
            },
            dashboardUiConfig: {
                hideTitle: true,
                hideChartControls: false,
                filters: { visible: true, expanded: false },
            },
        }).then(() => {
            this.loading = false;
        }).catch(() => {
            this.showError();
        });
    }

    private showError(): void {
        this.errorMessage = 'Unable to load this climate product. Please try again.';
        this.loading = false;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.container?.nativeElement) {
            this.container.nativeElement.innerHTML = '';
        }
    }
}
