import { Directive, ElementRef, HostListener, Output, EventEmitter } from '@angular/core';

// TODO. Rename this directive to a name that is appropriate?

@Directive({
  selector: '[appCloseDropDown]'
})
export class CloseDropDownDirective {

  @Output() public closeDropdown = new EventEmitter<void>();

  constructor(private eRef: ElementRef) { }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    // Emit event to close the dropdown if clicked outside of the element
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.closeDropdown.emit();
    }
  }

}
