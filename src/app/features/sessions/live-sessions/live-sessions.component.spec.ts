import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveSessionsComponent } from './live-sessions.component';

describe('LiveSessionsComponent', () => {
  let component: LiveSessionsComponent;
  let fixture: ComponentFixture<LiveSessionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiveSessionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiveSessionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
