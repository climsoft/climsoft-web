import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValueFlagEntryComponent } from './value-flag-entry.component';

describe('ValueFlagEntryComponent', () => {
  let component: ValueFlagEntryComponent;
  let fixture: ComponentFixture<ValueFlagEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValueFlagEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ValueFlagEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
