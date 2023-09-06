import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorInputComponent } from './selector-input.component';

describe('SelectorInputComponent', () => {
  let component: SelectorInputComponent;
  let fixture: ComponentFixture<SelectorInputComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SelectorInputComponent]
    });
    fixture = TestBed.createComponent(SelectorInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
