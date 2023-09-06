import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataGridEntryComponent } from './data-grid-entry.component';

describe('DataGridEntryComponent', () => {
  let component: DataGridEntryComponent;
  let fixture: ComponentFixture<DataGridEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataGridEntryComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataGridEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
