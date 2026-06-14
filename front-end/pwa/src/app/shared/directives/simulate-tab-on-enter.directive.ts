import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appSimulateTabOnEnter]'
})
export class SimulateTabOnEnterDirective {
  constructor(private el: ElementRef) { }

  @HostListener('keydown.enter', ['$event'])
  public onEnterPress(event: Event) {
    // Prevent the default Enter key action
    event.preventDefault();

    // Find the next focusable element and focus it
    this.focusNextElement();
  }

  private focusNextElement() {
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const elementsList = Array.from(document.querySelectorAll(focusableElements))
      .filter(el => !el.classList.contains('btn-input-group')) // Exclude buttons that are part of an input
      // Skip disabled form controls (matches [disabled] and elements inside a disabled fieldset)
      // and elements explicitly marked aria-disabled.
      .filter(el => !el.matches(':disabled') && el.getAttribute('aria-disabled') !== 'true');

    const currentElementIndex = elementsList.findIndex(el => el === this.el.nativeElement);
    if (currentElementIndex === -1 || elementsList.length === 0) return;
    const nextElementIndex = (currentElementIndex + 1) % elementsList.length;
    const nextElement = elementsList[nextElementIndex] as HTMLElement;

    nextElement?.focus();
  }
}
