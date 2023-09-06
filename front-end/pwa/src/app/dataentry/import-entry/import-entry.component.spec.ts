import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportEntryComponent } from './import-entry.component';

describe('ImportEntryComponent', () => {
  let component: ImportEntryComponent;
  let fixture: ComponentFixture<ImportEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportEntryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
