import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PricingPlanDetailsComponent } from './pricing-plan-details.component';

describe('PricingPlanDetailsComponent', () => {
  let component: PricingPlanDetailsComponent;
  let fixture: ComponentFixture<PricingPlanDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingPlanDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PricingPlanDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
