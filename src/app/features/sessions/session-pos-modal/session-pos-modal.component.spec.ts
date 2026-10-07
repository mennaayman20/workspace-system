import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionPosModalComponent } from './session-pos-modal.component';

describe('SessionPosModalComponent', () => {
  let component: SessionPosModalComponent;
  let fixture: ComponentFixture<SessionPosModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionPosModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionPosModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
