import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appSimulateTabOnEnter]'
})
export class SimulateTabOnEnterDirective {
  constructor(private el: ElementRef) {}

  @HostListener('keydown.enter', ['$event'])
 public onEnterPress(event: KeyboardEvent) {
   // Prevent the default Enter key action
    event.preventDefault();

    // Find the next focusable element and focus it
    this.focusNextElement();
  }

  private focusNextElement() {
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const elementsList = Array.from(document.querySelectorAll(focusableElements))
      .filter(el => !el.classList.contains('btn-input-group')); // Exclude buttons that are part of an input

    const currentElementIndex = elementsList.findIndex(el => el === this.el.nativeElement);
    const nextElementIndex = (currentElementIndex + 1) % elementsList.length;
    const nextElement = elementsList[nextElementIndex] as HTMLElement;

    nextElement?.focus();
  }
}

