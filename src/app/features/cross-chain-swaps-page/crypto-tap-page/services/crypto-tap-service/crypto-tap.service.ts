import { Injectable } from '@angular/core';
import { HttpService } from 'src/app/core/services/http/http.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import {
  CryptoTapToken,
  CryptoTapTrade
} from 'src/app/features/cross-chain-swaps-page/crypto-tap-page/models/CryptoTapTrade';
import { Web3PublicService } from 'src/app/core/services/blockchain/web3-public-service/web3-public.service';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { MetamaskError } from 'src/app/shared/models/errors/provider/MetamaskError';
import { AccountError } from 'src/app/shared/models/errors/provider/AccountError';
import { NetworkError } from 'src/app/shared/models/errors/provider/NetworkError';
import { Web3PrivateService } from 'src/app/core/services/blockchain/web3-private-service/web3-private.service';
import { UseTestingModeService } from 'src/app/core/services/use-testing-mode/use-testing-mode.service';
import InsufficientFundsError from 'src/app/shared/models/errors/instant-trade/InsufficientFundsError';
import { Web3Public } from 'src/app/core/services/blockchain/web3-public-service/Web3Public';
import BigNumber from 'bignumber.js';
import SwapToken from 'src/app/shared/models/tokens/SwapToken';
import { CryptoTapApiService } from 'src/app/core/services/backend/crypto-tap-api/crypto-tap-api.service';
import { TranslateService } from '@ngx-translate/core';
import { TransactionReceipt } from 'web3-eth';
import { ProviderConnectorService } from 'src/app/core/services/blockchain/provider-connector/provider-connector.service';
import { ErrorsService } from 'src/app/core/services/errors/errors.service';
import { ABI, contractAddressEthereum, contractAddressKovan } from './constants/ethContract';

interface EstimatedAmountResponse {
  from_amount: number;
  to_amount: number;
  fee_amount: number;
}

@Injectable()
export class CryptoTapService {
  private readonly baseApiUrl = 'https://devbnbexchange.mywish.io/api/v1/';

  private isTestingMode: boolean;

  private contractAddress: string;

  constructor(
    private httpService: HttpService,
    private web3PrivateService: Web3PrivateService,
    private web3PublicService: Web3PublicService,
    private cryptoTapApiService: CryptoTapApiService,
    private readonly translateService: TranslateService,
    private readonly providerConnectorService: ProviderConnectorService,
    private readonly errorService: ErrorsService,
    useTestingModeService: UseTestingModeService
  ) {
    this.contractAddress = contractAddressEthereum;

    useTestingModeService.isTestingMode.subscribe(isTestingMode => {
      this.isTestingMode = isTestingMode;
      if (isTestingMode) {
        this.contractAddress = contractAddressKovan;
      }
    });
  }

  public getEstimatedAmount(fromToken: SwapToken, toToken: SwapToken): Observable<CryptoTapToken> {
    return this.httpService
      .get(`estimate_amount/`, { fsym: fromToken.symbol, tsym: toToken.symbol }, this.baseApiUrl)
      .pipe(
        map((response: EstimatedAmountResponse) => ({
          ...fromToken,
          fromAmount: Web3PublicService.tokenWeiToAmount(
            fromToken,
            response.from_amount.toString()
          ).toFixed(),
          toAmount: Web3PublicService.tokenWeiToAmount(
            toToken,
            response.to_amount.toString()
          ).toFixed(),
          fee: Web3PublicService.tokenWeiToAmount(
            fromToken,
            response.fee_amount.toString()
          ).toFixed()
        }))
      );
  }

  private checkSettings() {
    const blockchain = BLOCKCHAIN_NAME.ETHEREUM;

    if (!this.providerConnectorService.isProviderActive) {
      this.errorService.throw(new MetamaskError());
    }

    if (!this.providerConnectorService.address) {
      this.errorService.throw(new AccountError());
    }
    if (
      this.providerConnectorService.networkName !== blockchain &&
      (this.providerConnectorService.networkName !== `${blockchain}_TESTNET` || !this.isTestingMode)
    ) {
      this.errorService.throw(new NetworkError(blockchain));
    }
  }

  protected async checkBalance(trade: CryptoTapTrade): Promise<void> {
    const token = trade.fromToken;
    const { fromAmount } = trade.fromToken;
    const amountIn = Web3PublicService.tokenAmountToWei(token, fromAmount);
    const web3Public: Web3Public = this.web3PublicService[BLOCKCHAIN_NAME.ETHEREUM];

    if (web3Public.isNativeAddress(token.address)) {
      const balance = await web3Public.getBalance(this.providerConnectorService.address, {
        inWei: true
      });
      if (balance.lt(amountIn)) {
        const formattedBalance = web3Public.weiToEth(balance);
        this.errorService.throw(
          new InsufficientFundsError(token.symbol, formattedBalance, fromAmount.toString())
        );
      }
    } else {
      const tokensBalance = await web3Public.getTokenBalance(
        this.providerConnectorService.address,
        token.address
      );
      if (tokensBalance.lt(amountIn)) {
        const formattedTokensBalance = Web3PublicService.tokenWeiToAmount(
          token,
          tokensBalance
        ).toFixed();
        this.errorService.throw(
          new InsufficientFundsError(token.symbol, formattedTokensBalance, fromAmount.toString())
        );
      }
    }
  }

  public async createTrade(
    trade: CryptoTapTrade,
    onTransactionHash: (hash: string) => void
  ): Promise<TransactionReceipt> {
    this.checkSettings();
    await this.checkBalance(trade);

    const { fromToken, toToken } = trade;
    const { fromAmount } = trade.fromToken;
    const toNetwork = toToken.blockchain === BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN ? 1 : 3;

    let receipt: TransactionReceipt;
    if (fromToken.symbol === 'ETH') {
      const estimatedGas = '120000';
      receipt = await this.web3PrivateService.executeContractMethod(
        this.contractAddress,
        ABI,
        'deposit',
        [toNetwork],
        {
          value: Web3PublicService.tokenAmountToWei(fromToken, fromAmount),
          onTransactionHash,
          gas: estimatedGas
        }
      );
    } else {
      await this.provideAllowance(fromToken, onTransactionHash);
      receipt = await this.web3PrivateService.executeContractMethod(
        this.contractAddress,
        ABI,
        'depositToken',
        [fromToken.address, toNetwork],
        {
          onTransactionHash
        }
      );
    }

    this.cryptoTapApiService.notifyCryptoTapBot(
      trade,
      receipt.transactionHash,
      this.providerConnectorService.address
    );

    return receipt;
  }

  private async provideAllowance(
    token: CryptoTapToken,
    onTransactionHash: (hash: string) => void
  ): Promise<void> {
    const web3Public: Web3Public = this.web3PublicService[BLOCKCHAIN_NAME.ETHEREUM];
    const allowance = await web3Public.getAllowance(
      token.address,
      this.providerConnectorService.address,
      this.contractAddress
    );
    const fromAmount = new BigNumber(Web3PublicService.tokenAmountToWei(token, token.fromAmount));
    if (fromAmount.gt(allowance)) {
      const uintInfinity = new BigNumber(2).pow(256).minus(1);
      await this.web3PrivateService.approveTokens(
        token.address,
        this.contractAddress,
        uintInfinity,
        {
          onTransactionHash
        }
      );
    }
  }
}
