import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { FROM_BACKEND_BLOCKCHAINS } from 'src/app/shared/constants/blockchain/BACKEND_BLOCKCHAINS';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { TableToken, TableTrade } from 'src/app/shared/models/my-trades/TableTrade';
import { InstantTradesPostApi } from 'src/app/core/services/backend/instant-trades-api/models/InstantTradesPostApi';
import { InstantTradesResponseApi } from 'src/app/core/services/backend/instant-trades-api/models/InstantTradesResponseApi';
import InstantTrade from 'src/app/features/instant-trade/models/InstantTrade';
import { INSTANT_TRADES_PROVIDER } from 'src/app/shared/models/instant-trade/INSTANT_TRADES_PROVIDER';
import { InstantTradeBotRequest } from 'src/app/core/services/backend/instant-trades-api/models/InstantTradesBotRequest';
import { HttpService } from '../../http/http.service';
import { BOT_URL } from '../constants/BOT_URL';
import { Web3PublicService } from '../../blockchain/web3-public-service/web3-public.service';
import { UseTestingModeService } from '../../use-testing-mode/use-testing-mode.service';
import { ProviderConnectorService } from '../../blockchain/provider-connector/provider-connector.service';
import { QueryParamsService } from '../../query-params/query-params.service';

const instantTradesApiRoutes = {
  createData: 'instant_trades/',
  editData: 'instant_trades/',
  getData: 'instant_trades/'
};

@Injectable({
  providedIn: 'root'
})
export class InstantTradesApiService {
  private isTestingMode: boolean;

  private isIframe: boolean;

  constructor(
    private httpService: HttpService,
    private useTestingModeService: UseTestingModeService,
    private readonly providerConnectorService: ProviderConnectorService,
    private queryParamsService: QueryParamsService
  ) {
    this.useTestingModeService.isTestingMode.subscribe(res => (this.isTestingMode = res));
    this.queryParamsService.isIframe$.subscribe(res => (this.isIframe = res));
  }

  public notifyInstantTradesBot(body: {
    provider: INSTANT_TRADES_PROVIDER;
    blockchain: BLOCKCHAIN_NAME;
    walletAddress: string;
    trade: InstantTrade;
    txHash: string;
  }): Promise<void> {
    const { trade, ...props } = body;
    const req: InstantTradeBotRequest = {
      ...props,
      fromAmount: trade.from.amount.div(10 ** trade.from.token.decimals).toNumber(),
      toAmount: trade.to.amount.div(10 ** trade.to.token.decimals).toNumber(),
      fromSymbol: trade.from.token.symbol,
      toSymbol: trade.to.token.symbol,
      price: trade.from.token.price
    };

    return this.httpService.post(BOT_URL.INSTANT_TRADES, req).toPromise();
  }

  /**
   * @description send request to server for add trade
   * @param tradeInfo data body for request
   * @return instant trade object
   */
  public createTrade(tradeInfo: InstantTradesPostApi): Observable<InstantTradesResponseApi | null> {
    if (this.isIframe) {
      return of(null);
    }

    if (this.isTestingMode) {
      tradeInfo.network = 'ethereum-test';
    }
    return this.httpService.post(instantTradesApiRoutes.createData, tradeInfo).pipe(delay(1000));
  }

  /**
   * @description update status of trade
   * @param hash hash of transaction what we want to update
   * @param status status of trade what we want to set
   */
  public patchTrade(hash: string, status: string): Observable<InstantTradesResponseApi | null> {
    if (this.isIframe) {
      return of(null);
    }

    const url = instantTradesApiRoutes.editData + hash;
    return this.httpService.patch(url, { status });
  }

  /**
   * @description get list of user's instant trades
   * @param walletAddress wallet address of user
   * @return list of trades
   */
  public getUserTrades(walletAddress: string): Observable<TableTrade[]> {
    return this.httpService
      .get(instantTradesApiRoutes.getData, { user: walletAddress.toLowerCase() })
      .pipe(
        map((swaps: InstantTradesResponseApi[]) =>
          swaps
            // @ts-ignore TODO hotfix
            .filter(swap => swap.status !== 'not_in_mempool')
            .map(swap => this.parseTradeApiToTableTrade(swap))
        )
      );
  }

  private parseTradeApiToTableTrade(tradeApi: InstantTradesResponseApi): TableTrade {
    function getTableToken(type: 'from' | 'to'): TableToken {
      const token = tradeApi[`${type}_token`];
      const amount = tradeApi[`${type}_amount`];
      return {
        blockchain: FROM_BACKEND_BLOCKCHAINS[token.blockchain_network],
        symbol: token.symbol,
        amount: Web3PublicService.weiToAmount(amount, token.decimals).toFixed(),
        image: token.image
      };
    }

    return {
      transactionHash: tradeApi.hash,
      status: tradeApi.status,
      provider: tradeApi.contract.name,
      fromToken: getTableToken('from'),
      toToken: getTableToken('to'),
      date: new Date(tradeApi.status_updated_at)
    };
  }
}
