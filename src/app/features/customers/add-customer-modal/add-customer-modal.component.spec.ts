import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCustomerModalComponent } from './add-customer-modal.component';

describe('AddCustomerModalComponent', () => {
  let component: AddCustomerModalComponent;
  let fixture: ComponentFixture<AddCustomerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCustomerModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddCustomerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
