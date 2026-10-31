import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsersManagmentsComponent } from './users-managments.component';

describe('UsersManagmentsComponent', () => {
  let component: UsersManagmentsComponent;
  let fixture: ComponentFixture<UsersManagmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsersManagmentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UsersManagmentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
