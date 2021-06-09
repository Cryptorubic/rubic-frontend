import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CrossChainSwapsComponent } from './main-page/cross-chain-swaps.component';

const routes: Routes = [
  {
    path: '',
    component: CrossChainSwapsComponent,
    children: [
      {
        path: 'bridge',
        loadChildren: () => import('./bridge-page/bridge-page.module').then(m => m.BridgePageModule)
      },
      {
        path: 'get-bnb',
        redirectTo: 'crypto-tap'
      },
      {
        path: 'crypto-tap',
        loadChildren: () =>
          import(
            'src/app/features/cross-chain-swaps-page/crypto-tap-page/crypto-tap-page.module'
          ).then(m => m.CryptoTapPageModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CrossChainSwapsPageRoutingModule {}
