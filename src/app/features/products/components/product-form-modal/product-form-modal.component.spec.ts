import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductFormModalComponent } from './product-form-modal.component';

describe('ProductFormModalComponent', () => {
  let component: ProductFormModalComponent;
  let fixture: ComponentFixture<ProductFormModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
