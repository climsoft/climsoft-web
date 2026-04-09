import { Directive, Input, Output, EventEmitter, ElementRef, Renderer2, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';

@Directive({
  selector: '[appSortableHeader]'
})
export class SortableHeaderDirective implements OnInit, OnChanges {
  @Input() appSortableHeader: string = '';
  @Input() sortColumn: string = '';
  @Input() sortDirection: 'asc' | 'desc' = 'asc';
  @Output() sort = new EventEmitter<string>();

  private sortActiveIcon!: HTMLElement;
  private sortPreviewIcon!: HTMLElement;

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const host = this.el.nativeElement;

    this.renderer.addClass(host, 'app-sortable-header');
    this.renderer.addClass(host, 'text-nowrap');

    this.sortActiveIcon = this.renderer.createElement('i');
    this.renderer.addClass(this.sortActiveIcon, 'bi');
    this.renderer.addClass(this.sortActiveIcon, 'sort-active');
    this.renderer.appendChild(host, this.sortActiveIcon);

    this.sortPreviewIcon = this.renderer.createElement('i');
    this.renderer.addClass(this.sortPreviewIcon, 'bi');
    this.renderer.addClass(this.sortPreviewIcon, 'sort-preview');
    this.renderer.appendChild(host, this.sortPreviewIcon);

    this.updateIcons();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.sortActiveIcon && this.sortPreviewIcon) {
      if (changes['sortColumn'] || changes['sortDirection'] || changes['appSortableHeader']) {
        this.updateIcons();
      }
    }
  }

  @HostListener('click')
  onClick(): void {
    this.sort.emit(this.appSortableHeader);
  }

  private updateIcons(): void {
    const isActive = this.sortColumn === this.appSortableHeader;

    this.renderer.removeClass(this.sortActiveIcon, 'bi-caret-up-fill');
    this.renderer.removeClass(this.sortActiveIcon, 'bi-caret-down-fill');
    this.renderer.removeClass(this.sortPreviewIcon, 'bi-caret-up-fill');
    this.renderer.removeClass(this.sortPreviewIcon, 'bi-caret-down-fill');

    if (isActive) {
      this.renderer.addClass(
        this.sortActiveIcon,
        this.sortDirection === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill'
      );
    }

    this.renderer.addClass(
      this.sortPreviewIcon,
      (isActive && this.sortDirection === 'asc') ? 'bi-caret-down-fill' : 'bi-caret-up-fill'
    );
  }
}
