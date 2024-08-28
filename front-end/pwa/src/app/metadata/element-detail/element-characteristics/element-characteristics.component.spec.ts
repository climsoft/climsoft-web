import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementCharacteristicsComponent } from './element-characteristics.component';

describe('ElementCharacteristicsComponent', () => {
  let component: ElementCharacteristicsComponent;
  let fixture: ComponentFixture<ElementCharacteristicsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ElementCharacteristicsComponent]
    });
    fixture = TestBed.createComponent(ElementCharacteristicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
