import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementTypeSingleInputComponent } from './element-type-single-input.component';

describe('ElementTypeSingleInputComponent', () => {
  let component: ElementTypeSingleInputComponent;
  let fixture: ComponentFixture<ElementTypeSingleInputComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ElementTypeSingleInputComponent]
    });
    fixture = TestBed.createComponent(ElementTypeSingleInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
