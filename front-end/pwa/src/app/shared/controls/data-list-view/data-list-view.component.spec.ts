import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataListViewComponent } from './data-list-view.component';

describe('DataListViewComponent', () => {
  let component: DataListViewComponent;
  let fixture: ComponentFixture<DataListViewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DataListViewComponent]
    });
    fixture = TestBed.createComponent(DataListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
