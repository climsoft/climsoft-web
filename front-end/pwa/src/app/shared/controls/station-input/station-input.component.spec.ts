import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StationInputComponent } from './station-input.component';

describe('StationInputComponent', () => {
  let component: StationInputComponent;
  let fixture: ComponentFixture<StationInputComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StationInputComponent]
    });
    fixture = TestBed.createComponent(StationInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
