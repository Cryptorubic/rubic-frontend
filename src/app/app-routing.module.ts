import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

export const PROJECT_PARTS = {
  TEST: {
    '^/.+$': 'devswaps.mywish.io'
  },
  PROD: {
    '^/$': 'swaps.network',
    '^/.+$': 'trades.swaps.network',
    from: 'swaps.network'
  },
  LOCAL: {
    '^/.+$': 'local.devswaps.mywish.io'
  }
};

let currMode = 'PROD';
Object.entries(PROJECT_PARTS).forEach(([projectPartName, projectPartValue]: [string, any]) => {
  Object.entries(projectPartValue).forEach(([, hostName]: [string, string]) => {
    if (location.hostname === hostName) {
      currMode = projectPartName;
    }
  });
});

export const MODE = currMode;

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./features/swaps-page/page-module/swaps-page.module').then(m => m.SwapsPageModule)
  },
  {
    path: 'bridge',
    redirectTo: 'cross-chain/bridge'
  },
  {
    path: 'cross-chain',
    loadChildren: () =>
      import('./features/cross-chain-swaps-page/cross-chain-swaps-page.module').then(
        m => m.CrossChainSwapsPageModule
      )
  },
  {
    path: 'buy-crypto',
    loadChildren: () =>
      import('./features/buy-crypto-page/buy-crypto-page.module').then(m => m.BuyCryptoPageModule)
  },
  {
    path: 'about',
    loadChildren: () =>
      import('./features/features-page/features-page.module').then(m => m.FeaturesPageModule)
  },
  {
    path: 'team',
    loadChildren: () => import('./features/team-page/team-page.module').then(m => m.TeamPageModule)
  },
  {
    path: 'public-v3/:unique_link',
    redirectTo: '/trade/:unique_link'
  },
  {
    path: 'trades/public-v3/:unique_link',
    redirectTo: '/trade/:unique_link'
  },
  {
    path: 'trade/:unique_link',
    loadChildren: () =>
      import('./features/order-book-trade-page/order-book-trade-page.module').then(
        m => m.OrderBookTradePageModule
      )
  },
  {
    path: 'contracts',
    redirectTo: '/trades/contracts'
  },
  {
    path: 'trades',
    loadChildren: () => import('./features/trades/trades.module').then(m => m.TradesModule)
  },
  {
    path: 'faq',
    loadChildren: () => import('./features/faq-page/faq-page.module').then(m => m.FaqPageModule)
  },
  {
    path: 'token-sale',
    loadChildren: () =>
      import('./features/token-sale-page/token-sale-page/token-sale-page.module').then(
        m => m.TokenSalePageModule
      )
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled',
      onSameUrlNavigation: 'reload',
      scrollPositionRestoration: 'enabled',
      relativeLinkResolution: 'legacy'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
