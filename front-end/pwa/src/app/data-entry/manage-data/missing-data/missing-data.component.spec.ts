import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissingDataComponent } from './missing-data.component';

describe('MissingDataComponent', () => {
  let component: MissingDataComponent;
  let fixture: ComponentFixture<MissingDataComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MissingDataComponent]
    });
    fixture = TestBed.createComponent(MissingDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
