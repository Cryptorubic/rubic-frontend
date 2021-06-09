import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CryptoTapComponent } from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/components/crypto-tap/crypto-tap.component';

const routes: Routes = [{ path: '', component: CryptoTapComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CryptoTapPageRoutingModule {}
