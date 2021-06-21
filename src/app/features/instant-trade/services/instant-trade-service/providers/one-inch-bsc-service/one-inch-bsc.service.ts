import { HttpClient } from '@angular/common/http';
import BigNumber from 'bignumber.js';
import { TransactionReceipt } from 'web3-eth';
import { WalletError } from 'src/app/shared/models/errors/provider/WalletError';
import { ErrorsService } from 'src/app/core/errors/errors.service';
import { OneinchQuoteError } from 'src/app/shared/models/errors/provider/OneinchQuoteError';
import InstantTradeToken from 'src/app/features/swaps-page-old/instant-trades/models/InstantTradeToken';
import InstantTrade from 'src/app/features/swaps-page-old/instant-trades/models/InstantTrade';
import { Web3PrivateService } from 'src/app/core/services/blockchain/web3-private-service/web3-private.service';
import { NetworkError } from 'src/app/shared/models/errors/provider/NetworkError';
import { NotSupportedNetworkError } from 'src/app/shared/models/errors/provider/NotSupportedNetwork';
import { WALLET_NAME } from 'src/app/core/header/components/header/components/wallets-modal/models/providers';
import InsufficientFundsError from 'src/app/shared/models/errors/instant-trade/InsufficientFundsError';
import { AccountError } from 'src/app/shared/models/errors/provider/AccountError';
import { map } from 'rxjs/operators';
import { BlockchainsInfo } from 'src/app/core/services/blockchain/blockchain-info';
import { ProviderConnectorService } from 'src/app/core/services/blockchain/provider-connector/provider-connector.service';
import { UseTestingModeService } from 'src/app/core/services/use-testing-mode/use-testing-mode.service';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { CoingeckoApiService } from 'src/app/core/services/external-api/coingecko-api/coingecko-api.service';
import { Web3PublicService } from 'src/app/core/services/blockchain/web3-public-service/web3-public.service';
import { Injectable } from '@angular/core';

interface OneInchQuoteResponse {
  fromToken: object;
  toToken: object;
  toTokenAmount: string;
  fromTokenAmount: string;
  protocols: unknown[];
  estimatedGas: string;
}

interface OneInchTokensResponse {
  tokens: {
    [key in string]: any;
  };
}

interface OneInchApproveResponse {
  address: string;
}

interface OneInchSwapResponse {
  tx: {
    from: string;
    to: string;
    data: string;
    value: string;
    gasPrice: string;
    gas: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class OneInchBscService {
  private readonly oneInchNativeAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

  private supportedTokensAddresses: string[] = [];

  private tokensLoadingProcess: Promise<void>;

  protected apiBaseUrl: string;

  protected blockchain: BLOCKCHAIN_NAME;

  protected web3Public: any;

  protected slippagePercent = 0.001; // 0.1%

  constructor(
    private readonly httpClient: HttpClient,
    private readonly coingeckoApiService: CoingeckoApiService,
    private readonly useTestingModeService: UseTestingModeService,
    private readonly web3Private: Web3PrivateService,
    private readonly web3PublicService: Web3PublicService,
    private readonly providerConnectorService: ProviderConnectorService,
    private readonly errorsService: ErrorsService
  ) {
    this.blockchain = BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN;
    const network = BlockchainsInfo.getBlockchainByName(this.blockchain);
    this.apiBaseUrl = `https://api.1inch.exchange/v3.0/${network.id}/`;
    this.web3Public = this.web3PublicService[this.blockchain];
    setTimeout(() => this.loadSupportedTokens());
  }

  private loadSupportedTokens() {
    this.tokensLoadingProcess = new Promise<void>(resolve => {
      this.httpClient
        .get(`${this.apiBaseUrl}tokens`)
        .subscribe((response: OneInchTokensResponse) => {
          resolve();
          this.supportedTokensAddresses = Object.keys(response.tokens);
        });
    });
  }

  private loadApproveAddress(): Promise<string> {
    return this.httpClient
      .get(`${this.apiBaseUrl}approve/spender`)
      .pipe(map((response: OneInchApproveResponse) => response.address))
      .toPromise();
  }

  public setSlippagePercent(slippagePercent: number): void {
    this.slippagePercent = slippagePercent;
  }

  public async calculateTrade(
    fromAmount: BigNumber,
    fromToken: InstantTradeToken,
    toToken: InstantTradeToken
  ): Promise<InstantTrade> {
    const { fromTokenAddress, toTokenAddress } = this.getOneInchTokenSpecificAddresses(
      fromToken,
      toToken
    );

    if (!this.supportedTokensAddresses.length) {
      await this.tokensLoadingProcess;
    }

    if (
      !this.supportedTokensAddresses.includes(fromTokenAddress) ||
      !this.supportedTokensAddresses.includes(toTokenAddress)
    ) {
      console.error(`One inch not support ${fromToken.address} or ${toToken.address}`);
      return null;
    }

    const oneInchTrade: OneInchQuoteResponse = (await this.httpClient
      .get(`${this.apiBaseUrl}quote`, {
        params: {
          fromTokenAddress,
          toTokenAddress,
          amount: fromAmount.multipliedBy(10 ** fromToken.decimals).toFixed(0)
        }
      })
      .toPromise()) as OneInchQuoteResponse;

    if (oneInchTrade.hasOwnProperty('errors') || !oneInchTrade.toTokenAmount) {
      this.errorsService.catch$(new OneinchQuoteError());
    }

    // TODO: верменный фикс, потому что rpc binance сломалось

    let estimatedGas;
    let gasFeeInUsd;
    let gasFeeInEth;

    if (this.blockchain !== BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN) {
      estimatedGas = new BigNumber(oneInchTrade.estimatedGas);
      const ethPrice = await this.coingeckoApiService.getEtherPriceInUsd();

      gasFeeInUsd = await this.web3Public.getGasFee(estimatedGas, ethPrice);
      gasFeeInEth = await this.web3Public.getGasFee(estimatedGas, new BigNumber(1));
    } else {
      estimatedGas = new BigNumber(0);
      gasFeeInUsd = new BigNumber(0);
      gasFeeInEth = new BigNumber(0);
    }

    return {
      from: {
        token: fromToken,
        amount: fromAmount
      },
      to: {
        token: toToken,
        amount: new BigNumber(oneInchTrade.toTokenAmount).div(10 ** toToken.decimals)
      },
      estimatedGas,
      gasFeeInUsd,
      gasFeeInEth
    };
  }

  public async createTrade(
    trade: InstantTrade,
    options: { onConfirm?: (hash: string) => void; onApprove?: (hash: string | null) => void }
  ): Promise<TransactionReceipt> {
    await this.checkSettings(this.blockchain);

    // TODO: верменный фикс, потому что rpc binance сломалось
    if (this.blockchain !== BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN) {
      await this.checkBalance(trade);
    }

    const { fromTokenAddress, toTokenAddress } = this.getOneInchTokenSpecificAddresses(
      trade.from.token,
      trade.to.token
    );

    const fromAmount = trade.from.amount.multipliedBy(10 ** trade.from.token.decimals).toFixed(0);

    if (fromTokenAddress !== this.oneInchNativeAddress) {
      const approveAddress = await this.loadApproveAddress();
      await this.provideAllowance(
        fromTokenAddress,
        new BigNumber(fromAmount),
        approveAddress,
        options.onApprove
      );
    }

    const oneInchTrade: OneInchSwapResponse = (await this.httpClient
      .get(`${this.apiBaseUrl}swap`, {
        params: {
          fromTokenAddress,
          toTokenAddress,
          amount: fromAmount,
          slippage: (this.slippagePercent * 100).toString(),
          fromAddress: this.providerConnectorService.address
        }
      })
      .toPromise()) as OneInchSwapResponse;

    const increasedGas = new BigNumber(oneInchTrade.tx.gas).multipliedBy(1.25).toFixed(0);

    if (fromTokenAddress !== this.oneInchNativeAddress) {
      await this.provideAllowance(
        trade.from.token.address,
        new BigNumber(fromAmount),
        oneInchTrade.tx.to,
        options.onApprove
      );

      return this.web3Private.sendTransaction(oneInchTrade.tx.to, '0', {
        onTransactionHash: options.onConfirm,
        data: oneInchTrade.tx.data,
        gas: increasedGas,
        gasPrice: oneInchTrade.tx.gasPrice
      });
    }

    return this.web3Private.sendTransaction(oneInchTrade.tx.to, fromAmount, {
      onTransactionHash: options.onConfirm,
      data: oneInchTrade.tx.data,
      gas: increasedGas,
      gasPrice: oneInchTrade.tx.gasPrice,
      inWei: true
    });
  }

  private getOneInchTokenSpecificAddresses(
    fromToken: InstantTradeToken,
    toToken: InstantTradeToken
  ): { fromTokenAddress: string; toTokenAddress: string } {
    const fromTokenAddress = this.web3Public.isNativeAddress(fromToken.address)
      ? this.oneInchNativeAddress
      : fromToken.address;
    const toTokenAddress = this.web3Public.isNativeAddress(toToken.address)
      ? this.oneInchNativeAddress
      : toToken.address;
    return { fromTokenAddress, toTokenAddress };
  }

  protected checkSettings(selectedBlockchain: BLOCKCHAIN_NAME) {
    if (!this.providerConnectorService.isProviderActive) {
      this.errorsService.catch$(new WalletError());
    }

    if (!this.providerConnectorService.address) {
      this.errorsService.catch$(new AccountError());
    }
    if (this.providerConnectorService.networkName !== selectedBlockchain) {
      if (this.providerConnectorService.networkName !== `${selectedBlockchain}_TESTNET`) {
        if (this.providerConnectorService.providerName === WALLET_NAME.METAMASK) {
          this.errorsService.catch$(new NetworkError(selectedBlockchain));
        } else {
          this.errorsService.catch$(new NotSupportedNetworkError(selectedBlockchain));
        }
      }
    }
  }

  protected async checkBalance(trade: InstantTrade): Promise<void> {
    const amountIn = trade.from.amount.multipliedBy(10 ** trade.from.token.decimals).toFixed(0);

    if (this.web3Public.isNativeAddress(trade.from.token.address)) {
      const balance = await this.web3Public.getBalance(this.providerConnectorService.address, {
        inWei: true
      });
      if (balance.lt(amountIn)) {
        const formattedBalance = this.web3Public.weiToEth(balance);
        this.errorsService.catch$(
          new InsufficientFundsError(
            trade.from.token.symbol,
            formattedBalance,
            trade.from.amount.toString()
          )
        );
      }
    } else {
      const tokensBalance = await this.web3Public.getTokenBalance(
        this.providerConnectorService.address,
        trade.from.token.address
      );
      if (tokensBalance.lt(amountIn)) {
        const formattedTokensBalance = tokensBalance
          .div(10 ** trade.from.token.decimals)
          .toString();
        this.errorsService.catch$(
          new InsufficientFundsError(
            trade.from.token.symbol,
            formattedTokensBalance,
            trade.from.amount.toString()
          )
        );
      }
    }
  }

  protected async provideAllowance(
    tokenAddress: string,
    value: BigNumber,
    targetAddress: string,
    onApprove?: (hash: string) => void
  ): Promise<void> {
    const allowance = await this.web3Public.getAllowance(
      tokenAddress,
      this.providerConnectorService.address,
      targetAddress
    );
    if (value.gt(allowance)) {
      const uintInfinity = new BigNumber(2).pow(256).minus(1);
      await this.web3Private.approveTokens(tokenAddress, targetAddress, uintInfinity, {
        onTransactionHash: onApprove
      });
    }
  }
}