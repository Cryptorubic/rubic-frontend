import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { CryptoTapService } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/services/crypto-tap-service/crypto-tap.service';
import { CrossChainSwapsPageModule } from 'src/app/features/cross-chain-swaps-page/cross-chain-swaps-page.module';
import { CryptoTapFormComponent } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/components/crypto-tap-form/crypto-tap-form.component';
import { CryptoTapComponent } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/components/crypto-tap/crypto-tap.component';
import { CryptoTapPageRoutingModule } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/crypto-tap-page-routing.module';

@NgModule({
  declarations: [CryptoTapComponent, CryptoTapFormComponent],
  imports: [CommonModule, CryptoTapPageRoutingModule, SharedModule, CrossChainSwapsPageModule],
  providers: [CryptoTapService]
})
export class CryptoTapPageModule {}
