import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HourInputComponent } from './hour-input.component';

describe('HourInputComponent', () => {
  let component: HourInputComponent;
  let fixture: ComponentFixture<HourInputComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HourInputComponent]
    });
    fixture = TestBed.createComponent(HourInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
