import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuyCryptoPageRoutingModule } from 'src/app/features/buy-crypto-page/buy-crypto-page-routing.module';
import { BuyCryptoComponent } from './components/buy-crypto/buy-crypto.component';

@NgModule({
  declarations: [BuyCryptoComponent],
  imports: [BuyCryptoPageRoutingModule, CommonModule]
})
export class BuyCryptoPageModule {}
