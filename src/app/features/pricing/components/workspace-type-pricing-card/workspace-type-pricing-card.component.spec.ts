import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceTypePricingCardComponent } from './workspace-type-pricing-card.component';

describe('WorkspaceTypePricingCardComponent', () => {
  let component: WorkspaceTypePricingCardComponent;
  let fixture: ComponentFixture<WorkspaceTypePricingCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceTypePricingCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceTypePricingCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
