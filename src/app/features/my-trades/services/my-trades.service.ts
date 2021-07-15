import { Injectable } from '@angular/core';
import { EthereumPolygonBridgeService } from 'src/app/features/my-trades/services/ethereum-polygon-bridge-service/ethereum-polygon-bridge.service';
import {
  BehaviorSubject,
  combineLatest,
  forkJoin,
  Observable,
  of,
  Subject,
  throwError,
  zip
} from 'rxjs';
import { catchError, defaultIfEmpty, filter, map, mergeMap, takeWhile } from 'rxjs/operators';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { TransactionReceipt } from 'web3-eth';
import { ProviderConnectorService } from 'src/app/core/services/blockchain/provider-connector/provider-connector.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { TokenAmount } from 'src/app/shared/models/tokens/TokenAmount';
import { List } from 'immutable';
import { TableTrade } from 'src/app/shared/models/my-trades/TableTrade';
import { InstantTradesApiService } from 'src/app/core/services/backend/instant-trades-api/instant-trades-api.service';
import { BridgeApiService } from 'src/app/core/services/backend/bridge-api/bridge-api.service';
import { TokensService } from 'src/app/core/services/tokens/tokens.service';
import { NetworkError } from 'src/app/core/errors/models/provider/NetworkError';
import { UserRejectError } from 'src/app/core/errors/models/provider/UserRejectError';
import { HttpClient } from '@angular/common/http';
import { BRIDGE_PROVIDER } from 'src/app/shared/models/bridge/BRIDGE_PROVIDER';

interface PanamaStatusResponse {
  data: {
    depositTxId: string;
  };
}

@Injectable()
export class MyTradesService {
  private _isDataUpdating$ = new Subject<void>();

  public isDataUpdating$ = this._isDataUpdating$.asObservable();

  private _tableTrades$ = new BehaviorSubject<TableTrade[]>(undefined);

  public tableTrades$ = this._tableTrades$.asObservable();

  private tokens: List<TokenAmount>;

  private walletAddress: string;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly providerConnectorService: ProviderConnectorService,
    private readonly authService: AuthService,
    private readonly tokensService: TokensService,
    private readonly instantTradesApiService: InstantTradesApiService,
    private readonly bridgeApiService: BridgeApiService,
    private readonly ethereumPolygonBridgeService: EthereumPolygonBridgeService
  ) {
    combineLatest([
      this.authService.getCurrentUser().pipe(filter(user => user !== undefined)),
      this.tokensService.tokens.pipe(takeWhile(tokens => tokens.size === 0, true))
    ]).subscribe(([user, tokens]) => {
      this.tokens = tokens;
      this.walletAddress = user?.address || null;

      this._isDataUpdating$.next();

      if (tokens.size) {
        this.updateTableTrades();
      }
    });
  }

  public updateTableTrades(): void {
    if (!this.walletAddress) {
      this._tableTrades$.next([]);
      return;
    }

    if (!this.tokens.size) {
      return;
    }

    zip(
      this.getBridgeTransactions(),
      this.instantTradesApiService.getUserTrades(this.walletAddress)
    ).subscribe(data => {
      this._tableTrades$.next(data.flat());
    });
  }

  private getBridgeTransactions(): Observable<TableTrade[]> {
    return this.bridgeApiService.getUserTrades(this.walletAddress).pipe(
      mergeMap(trades => {
        const filteredTrades = trades
          .map(trade => this.prepareBridgeData(trade))
          .filter(trade => !!trade);
        const sources: Observable<string>[] = filteredTrades.map(trade =>
          trade.provider === BRIDGE_PROVIDER.PANAMA
            ? this.loadPanamaTxHash(trade.transactionHash)
            : of(trade.transactionHash)
        );
        return forkJoin(sources).pipe(
          map(txHashes =>
            txHashes.map((hash, index) => ({
              ...filteredTrades[index],
              transactionHash: hash
            }))
          ),
          defaultIfEmpty([])
        );
      })
    );
  }

  private prepareBridgeData(trade: TableTrade): TableTrade {
    let fromSymbol = trade.fromToken.symbol;
    let toSymbol = trade.toToken.symbol;
    if (trade.provider === 'polygon') {
      fromSymbol = this.tokens.find(
        token =>
          token.blockchain === trade.fromToken.blockchain &&
          token.address.toLowerCase() === fromSymbol.toLowerCase()
      )?.symbol;
      toSymbol = this.tokens.find(
        token =>
          token.blockchain === trade.toToken.blockchain &&
          token.address.toLowerCase() === toSymbol.toLowerCase()
      )?.symbol;

      if (!fromSymbol || !toSymbol) {
        return null;
      }
    }

    return {
      ...trade,
      fromToken: {
        ...trade.fromToken,
        symbol: fromSymbol
      },
      toToken: {
        ...trade.toToken,
        symbol: toSymbol
      }
    };
  }

  public getTableTradeByDate(date: Date): TableTrade {
    return this._tableTrades$.getValue()?.find(trade => trade.date.getTime() === date.getTime());
  }

  private checkSettings(blockchain: BLOCKCHAIN_NAME): void {
    if (this.providerConnectorService.network?.name !== blockchain) {
      throw new NetworkError(blockchain);
    }
  }

  public depositPolygonBridgeTradeAfterCheckpoint(
    burnTransactionHash: string,
    onTransactionHash: (hash: string) => void
  ): Observable<TransactionReceipt> {
    try {
      this.checkSettings(BLOCKCHAIN_NAME.ETHEREUM);
    } catch (err) {
      return throwError(err);
    }

    return this.ethereumPolygonBridgeService
      .depositTradeAfterCheckpoint(burnTransactionHash, onTransactionHash)
      .pipe(
        catchError(err => {
          if (err.code === 4001) {
            return throwError(new UserRejectError());
          }
          return throwError(err);
        })
      );
  }

  public loadPanamaTxHash(panamaId): Observable<string> {
    return this.httpClient
      .get(`https://api.binance.org/bridge/api/v2/swaps/${panamaId}`)
      .pipe(map((response: PanamaStatusResponse) => response.data.depositTxId));
  }
}
