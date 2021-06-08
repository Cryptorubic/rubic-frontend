import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuyCryptoComponent } from './buy-crypto.component';

describe('BuyCryptoComponent', () => {
  let component: BuyCryptoComponent;
  let fixture: ComponentFixture<BuyCryptoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BuyCryptoComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyCryptoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
