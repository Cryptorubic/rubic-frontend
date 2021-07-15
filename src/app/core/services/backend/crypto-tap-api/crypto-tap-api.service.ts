import { Injectable } from '@angular/core';
import { HttpService } from 'src/app/core/services/http/http.service';
import { BOT_URL } from 'src/app/core/services/backend/constants/BOT_URL';
import { TokenAmount } from 'src/app/shared/models/tokens/TokenAmount';
import { CryptoTapBotRequest } from 'src/app/core/services/backend/crypto-tap-api/models/CryptoTapBotRequest';

@Injectable({
  providedIn: 'root'
})
export class CryptoTapApiService {
  constructor(private httpService: HttpService) {}

  public notifyCryptoTapBot(parameters: {
    fromToken: TokenAmount;
    toToken: TokenAmount;
    fromAmount: string;
    toAmount: string;
    transactionHash: string;
    walletAddress: string;
  }): Promise<void> {
    const data: CryptoTapBotRequest = {
      txHash: parameters.transactionHash,
      walletAddress: parameters.walletAddress,
      fromAmount: Number(parameters.fromAmount),
      toAmount: Number(parameters.toAmount),
      blockchain: parameters.toToken.blockchain,
      symbol: parameters.fromToken.symbol,
      price: parameters.fromToken.price
    };

    return this.httpService.post(BOT_URL.CRYPTO_TAP, data).toPromise();
  }
}
