import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CryptoTapComponent } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/components/crypto-tap/crypto-tap.component';

describe('CryptoTapComponent', () => {
  let component: CryptoTapComponent;
  let fixture: ComponentFixture<CryptoTapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CryptoTapComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CryptoTapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
