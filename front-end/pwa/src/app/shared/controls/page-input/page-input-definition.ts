export class PageInputDefinition {

    /** Total number of rows */
    private _totalRowCount: number = 0;

    /**
     * Similar to limit
     */
    private _pageSize: number = 31;

    /**
     * Similar to offset, except it starts at 1
     */
    private _page: number = 0;

    /**
     * Total number of pages in the total row count depending on the page size
     */
    private _totalPages: number = 0;

    public get totalRowCount(): number {
        return this._totalRowCount;
    }

    public get totalPages(): number {
        return this._totalPages;
    }

    public get page(): number {
        return this._page;
    }

    public get pageSize(): number {
        return this._pageSize;
    }

    public setTotalRowCount(totalRowCount: number): void {
        if (totalRowCount > 0) {
            this._totalRowCount = totalRowCount;
            this._page = 1;
        } else {
            this._totalRowCount = 0;
            this._page = 0;
        }

        this.setTotalPages();
    }

    private setTotalPages(): void{
        this._totalPages = this.totalRowCount && this.pageSize? Math.ceil(this.totalRowCount / this.pageSize): 0; 
    }

    public setPageSize(pageSize: number): void {
        this._pageSize = pageSize;
        this.setTotalPages();
    }

    public onFirst(): boolean {
        if (this.page <= 1) {
            return false;
        }
        this._page = 1;
        return true;
    }

    public onPrevious(): boolean {
        if (this.page <= 1) {
            return false;
        }
        this._page = this.page - 1;
        return true;
    }

    public onNext(): boolean {
        if (this.page >= this._totalPages) {
            return false;
        }

        this._page = this.page + 1;
        return true;
    }

    public onLast(): boolean {
        if (this.page >= this._totalPages) {
            return false;
        }

        this._page = this._totalPages;
        return true;
    }

}