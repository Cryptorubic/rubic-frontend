import { Inject, Injectable } from '@angular/core';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { OneInchEthService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/one-inch-eth-service/one-inch-eth.service';
import { SwapFormService } from 'src/app/features/swaps/services/swaps-form-service/swap-form.service';
import BigNumber from 'bignumber.js';
import { TuiNotification, TuiNotificationsService } from '@taiga-ui/core';
import { forkJoin, Observable, Subscription, timer } from 'rxjs';
import { UniSwapService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/uni-swap-service/uni-swap.service';
import { ErrorsService } from 'src/app/core/errors/errors.service';
import { map, switchMap } from 'rxjs/operators';
import { INSTANT_TRADES_TRADE_STATUS } from 'src/app/features/swaps/models/INSTANT_TRADES_TRADE_STATUS';
import { InstantTradesApiService } from 'src/app/core/services/backend/instant-trades-api/instant-trades-api.service';
import { Web3PublicService } from 'src/app/core/services/blockchain/web3-public-service/web3-public.service';
import { OneInchPolService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/one-inch-polygon-service/one-inch-pol.service';
import { QuickSwapService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/quick-swap-service/quick-swap.service';
import { PancakeSwapService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/pancake-swap-service/pancake-swap.service';
import { TO_BACKEND_BLOCKCHAINS } from 'src/app/shared/constants/blockchain/BACKEND_BLOCKCHAINS';
import { OneInchBscService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/one-inch-bsc-service/one-inch-bsc.service';
import { ItProvider } from 'src/app/features/instant-trade/services/instant-trade-service/models/it-provider';
import { INSTANT_TRADES_PROVIDER } from 'src/app/shared/models/instant-trade/INSTANT_TRADES_PROVIDER';
import { InstantTradesPostApi } from 'src/app/core/services/backend/instant-trades-api/models/InstantTradesPostApi';
import InstantTrade from 'src/app/features/instant-trade/models/InstantTrade';
import { TranslateService } from '@ngx-translate/core';
import TransactionRevertedError from 'src/app/core/errors/models/common/transaction-reverted.error';
import { SushiSwapPolygonService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/sushi-swap-polygon-service/sushi-swap-polygon.service';
import { SushiSwapEthService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/sushi-swap-eth-service/sushi-swap-eth.service';
import { SushiSwapBscService } from 'src/app/features/instant-trade/services/instant-trade-service/providers/sushi-swap-bsc-service/sushi-swap-bsc.service';

@Injectable({
  providedIn: 'root'
})
export class InstantTradeService {
  private blockchainsProviders;

  private currentBlockchain: BLOCKCHAIN_NAME;

  private modalShowing: Subscription;

  constructor(
    // Providers start
    private readonly oneInchEthService: OneInchEthService,
    private readonly uniswapService: UniSwapService,
    private readonly oneInchPolygonService: OneInchPolService,
    private readonly pancakeSwapService: PancakeSwapService,
    private readonly quickSwapService: QuickSwapService,
    private readonly oneInchBscService: OneInchBscService,
    private readonly sushiSwapEthService: SushiSwapEthService,
    private readonly sushiSwapPolygonService: SushiSwapPolygonService,
    private readonly sushiSwapBscService: SushiSwapBscService,
    // Providers end
    private readonly instantTradesApiService: InstantTradesApiService,
    private readonly errorService: ErrorsService,
    private readonly swapFormService: SwapFormService,
    @Inject(TuiNotificationsService) private readonly notificationsService: TuiNotificationsService,
    private readonly web3Public: Web3PublicService,
    private translateService: TranslateService
  ) {
    this.currentBlockchain = BLOCKCHAIN_NAME.ETHEREUM;
    this.setBlockchainsProviders();
    this.swapFormService.itProviders.subscribe(providers => {
      this.blockchainsProviders = providers;
    });
    this.swapFormService.commonTrade.controls.input.valueChanges.subscribe(form => {
      if (form.fromBlockchain === form.toBlockchain) {
        this.currentBlockchain = form.fromBlockchain;
      }
    });
  }

  public async calculateTrades(): Promise<PromiseSettledResult<InstantTrade>[]> {
    const { fromAmount, fromToken, toToken } =
      this.swapFormService.commonTrade.controls.input.value;
    const providersDataPromises = Object.values(
      this.blockchainsProviders[this.currentBlockchain]
    ).map(async (provider: ItProvider) => provider.calculateTrade(fromAmount, fromToken, toToken));
    return Promise.allSettled(providersDataPromises);
  }

  public async createTrade(provider: INSTANT_TRADES_PROVIDER, trade: InstantTrade): Promise<void> {
    try {
      let tradeInfo;
      const receipt = await this.blockchainsProviders[this.currentBlockchain][provider].createTrade(
        trade,
        {
          onConfirm: async hash => {
            if (provider === INSTANT_TRADES_PROVIDER.ONEINCH) {
              tradeInfo = {
                hash,
                network: TO_BACKEND_BLOCKCHAINS[this.currentBlockchain],
                provider,
                from_token: trade.from.token.address,
                to_token: trade.to.token.address,
                from_amount: Web3PublicService.amountToWei(
                  trade.from.amount,
                  trade.from.token.decimals
                ),
                to_amount: Web3PublicService.amountToWei(trade.to.amount, trade.to.token.decimals)
              };
            } else {
              tradeInfo = {
                hash,
                provider,
                network: TO_BACKEND_BLOCKCHAINS[this.currentBlockchain]
              };
            }
            await this.postTrade(tradeInfo);
            this.modalShowing = this.notificationsService
              .show(this.translateService.instant('notifications.tradeInProgress'), {
                status: TuiNotification.Info,
                autoClose: false
              })
              .subscribe();
          }
        }
      );
      this.modalShowing.unsubscribe();
      this.updateTrade(receipt.transactionHash, INSTANT_TRADES_TRADE_STATUS.COMPLETED);
      this.notificationsService
        .show(this.translateService.instant('notifications.successfulTradeTitle'), {
          status: TuiNotification.Success
        })
        .subscribe();
      await this.instantTradesApiService.notifyInstantTradesBot({
        provider,
        blockchain: this.currentBlockchain,
        walletAddress: receipt.from,
        trade,
        txHash: receipt.transactionHash
      });
    } catch (err) {
      if (err instanceof TransactionRevertedError) {
        console.error(err);
      } else {
        this.errorService.catch$(err);
      }
    } finally {
      if (this.modalShowing) {
        this.modalShowing.unsubscribe();
      }
    }
  }

  public async postTrade(data: InstantTradesPostApi) {
    const web3Public = this.web3Public[this.currentBlockchain];
    await web3Public.getTransactionByHash(data.hash, 0, 60, 1000);
    timer(1000)
      .pipe(switchMap(() => this.instantTradesApiService.createTrade(data)))
      .subscribe();
  }

  public updateTrade(hash: string, status: INSTANT_TRADES_TRADE_STATUS) {
    return this.instantTradesApiService.patchTrade(hash, status).subscribe({
      // tslint:disable-next-line:no-console
      error: err => console.debug('IT patch request is failed', err)
    });
  }

  private setBlockchainsProviders(): void {
    this.swapFormService.setItProviders({
      [BLOCKCHAIN_NAME.ETHEREUM]: {
        [INSTANT_TRADES_PROVIDER.ONEINCH]: this.oneInchEthService,
        [INSTANT_TRADES_PROVIDER.UNISWAP]: this.uniswapService,
        [INSTANT_TRADES_PROVIDER.SUSHISWAP]: this.sushiSwapEthService
      },
      [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
        [INSTANT_TRADES_PROVIDER.ONEINCH]: this.oneInchBscService,
        [INSTANT_TRADES_PROVIDER.PANCAKESWAP]: this.pancakeSwapService,
        [INSTANT_TRADES_PROVIDER.SUSHISWAP]: this.sushiSwapBscService
      },
      [BLOCKCHAIN_NAME.POLYGON]: {
        [INSTANT_TRADES_PROVIDER.ONEINCH]: this.oneInchPolygonService,
        [INSTANT_TRADES_PROVIDER.QUICKSWAP]: this.quickSwapService,
        [INSTANT_TRADES_PROVIDER.SUSHISWAP]: this.sushiSwapPolygonService
      }
    });
  }

  public needApprove(): Observable<boolean> {
    const { fromToken, fromAmount } = this.swapFormService.commonTrade.controls.input.value;
    const providerApproveData = Object.values(
      this.blockchainsProviders[this.currentBlockchain]
    ).map((provider: ItProvider) => provider.getAllowance(fromToken.address));

    return forkJoin(providerApproveData).pipe(
      map((approveArray: BigNumber[]) => {
        return approveArray.some(el => fromAmount.gt(el));
      })
    );
  }

  public async approve(provider: INSTANT_TRADES_PROVIDER, trade: InstantTrade): Promise<void> {
    try {
      await (this.blockchainsProviders[this.currentBlockchain][provider] as ItProvider).approve(
        trade.from.token.address,
        {
          onTransactionHash: () => {
            this.modalShowing = this.notificationsService
              .show(this.translateService.instant('notifications.approveInProgress'), {
                status: TuiNotification.Info,
                autoClose: false
              })
              .subscribe();
          }
        }
      );
      this.modalShowing.unsubscribe();
      this.notificationsService
        .show(this.translateService.instant('notifications.successApprove'), {
          status: TuiNotification.Success
        })
        .subscribe();
    } catch (err) {
      if (this.modalShowing) {
        this.modalShowing.unsubscribe();
      }
      throw err;
    }
  }

  public getApprove(): Observable<boolean[]> | never {
    const { fromToken, fromAmount } = this.swapFormService.commonTrade.controls.input.value;
    const providers = Object.values(this.blockchainsProviders[this.currentBlockchain]);
    const providerApproveData = providers.map((provider: ItProvider) =>
      provider.getAllowance(fromToken.address)
    );

    return forkJoin(providerApproveData).pipe(
      map((approveArray: BigNumber[]) => {
        return approveArray.map(el => fromAmount.gt(el));
      })
    );
  }
}
