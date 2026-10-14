import { Directive, ElementRef, Output, EventEmitter, Input, OnChanges, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appCloseDropDown]'
})
export class CloseDropDownDirective implements OnChanges, OnDestroy {

  /**
   * Whether the drop down is open. The document click listener only exists while
   * it is, because every document listener is a separate zone task and so a full
   * change detection pass per click. Large grids of inputs (e.g. entry forms with
   * hundreds of value flag inputs) otherwise run hundreds of passes per click.
   */
  @Input('appCloseDropDown') public isOpen: boolean = false;

  @Output() public closeDropdown = new EventEmitter<void>();

  private removeDocumentClickListener: (() => void) | null = null;

  constructor(private eRef: ElementRef, private renderer: Renderer2) { }

  ngOnChanges(): void {
    if (this.isOpen && !this.removeDocumentClickListener) {
      this.removeDocumentClickListener = this.renderer.listen('document', 'click', (event: MouseEvent) => this.onDocumentClick(event));
    } else if (!this.isOpen) {
      this.stopListening();
    }
  }

  ngOnDestroy(): void {
    this.stopListening();
  }

  private onDocumentClick(event: MouseEvent): void {
    // Emit event to close the dropdown if clicked outside of the element
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.closeDropdown.emit();
    }
  }

  private stopListening(): void {
    if (this.removeDocumentClickListener) {
      this.removeDocumentClickListener();
      this.removeDocumentClickListener = null;
    }
  }

}
