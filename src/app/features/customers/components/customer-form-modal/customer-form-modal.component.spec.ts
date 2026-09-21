import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerFormModalComponent } from './customer-form-modal.component';

describe('CustomerFormModalComponent', () => {
  let component: CustomerFormModalComponent;
  let fixture: ComponentFixture<CustomerFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerFormModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomerFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
