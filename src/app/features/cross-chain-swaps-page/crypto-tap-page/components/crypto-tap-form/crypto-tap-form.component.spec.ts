import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CryptoTapFormComponent } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/components/crypto-tap-form/crypto-tap-form.component';

describe('CryptoTapFormComponent', () => {
  let component: CryptoTapFormComponent;
  let fixture: ComponentFixture<CryptoTapFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CryptoTapFormComponent]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CryptoTapFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
