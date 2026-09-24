import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceToolbarComponent } from './workspace-toolbar.component';

describe('WorkspaceToolbarComponent', () => {
  let component: WorkspaceToolbarComponent;
  let fixture: ComponentFixture<WorkspaceToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceToolbarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkspaceToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
