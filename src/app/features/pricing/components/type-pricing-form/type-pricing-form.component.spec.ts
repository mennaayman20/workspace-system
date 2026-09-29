import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypePricingFormComponent } from './type-pricing-form.component';

describe('TypePricingFormComponent', () => {
  let component: TypePricingFormComponent;
  let fixture: ComponentFixture<TypePricingFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypePricingFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypePricingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
