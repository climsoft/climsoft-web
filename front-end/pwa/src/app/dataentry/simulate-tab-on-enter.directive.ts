import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[simulateTabOnEnter]'
})
export class SimulateTabOnEnterDirective {
  constructor(private el: ElementRef) {}

  @HostListener('keydown.enter', ['$event'])
 public onEnterPress(event: KeyboardEvent) {
    event.preventDefault(); // Prevent the default Enter key action

    // Find the next focusable element and focus it
    this.focusNextElement();
  }

 

  private focusNextElement() {
    const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const elementsList = Array.from(document.querySelectorAll(focusableElements))
      .filter(el => !el.classList.contains('btn-input-group')); // Exclude elements with a specific class

    const currentElementIndex = elementsList.findIndex(el => el === this.el.nativeElement);
    const nextElementIndex = (currentElementIndex + 1) % elementsList.length;
    const nextElement = elementsList[nextElementIndex] as HTMLElement;

    nextElement?.focus();
  }
}

