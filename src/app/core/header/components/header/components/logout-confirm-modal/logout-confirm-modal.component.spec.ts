import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoutConfirmModalComponent } from './logout-confirm-modal.component';

describe('LogoutConfirmModalComponent', () => {
  let component: LogoutConfirmModalComponent;
  let fixture: ComponentFixture<LogoutConfirmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientModule],
      declarations: [LogoutConfirmModalComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LogoutConfirmModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});