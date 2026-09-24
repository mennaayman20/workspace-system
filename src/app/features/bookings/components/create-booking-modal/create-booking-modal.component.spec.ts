import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateBookingModalComponent } from './create-booking-modal.component';

describe('CreateBookingModalComponent', () => {
  let component: CreateBookingModalComponent;
  let fixture: ComponentFixture<CreateBookingModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBookingModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateBookingModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
