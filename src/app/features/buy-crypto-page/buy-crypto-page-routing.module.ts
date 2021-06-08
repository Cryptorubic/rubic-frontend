import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BuyCryptoComponent } from 'src/app/features/buy-crypto-page/components/buy-crypto/buy-crypto.component';

const routes: Routes = [{ path: '', component: BuyCryptoComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BuyCryptoPageRoutingModule {}
