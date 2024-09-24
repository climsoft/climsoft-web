import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementCharacteristicsInputDialogComponent } from './element-characteristics-input-dialog.component';

describe('ElementCharacteristicsInputDialogComponent', () => {
  let component: ElementCharacteristicsInputDialogComponent;
  let fixture: ComponentFixture<ElementCharacteristicsInputDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ElementCharacteristicsInputDialogComponent]
    });
    fixture = TestBed.createComponent(ElementCharacteristicsInputDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
