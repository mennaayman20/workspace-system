import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferSessionModalComponent } from './transfer-session-modal.component';

describe('TransferSessionModalComponent', () => {
  let component: TransferSessionModalComponent;
  let fixture: ComponentFixture<TransferSessionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferSessionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransferSessionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
