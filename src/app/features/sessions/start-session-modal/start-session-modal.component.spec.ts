import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartSessionModalComponent } from './start-session-modal.component';

describe('StartSessionModalComponent', () => {
  let component: StartSessionModalComponent;
  let fixture: ComponentFixture<StartSessionModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartSessionModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartSessionModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
