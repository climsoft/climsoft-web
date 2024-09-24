import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeletedDataComponent } from './deleted-data.component';

describe('DeletedDataComponent', () => {
  let component: DeletedDataComponent;
  let fixture: ComponentFixture<DeletedDataComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DeletedDataComponent]
    });
    fixture = TestBed.createComponent(DeletedDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
