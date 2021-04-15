import { Injectable } from '@angular/core';
import { Web3PrivateService } from '../../../../../core/services/blockchain/web3-private-service/web3-private.service';
import {
  abi,
  maxTransitTokens,
  routingProviders,
  uniSwapContracts,
  WETH
} from './quick-swap-constants';
import { CoingeckoApiService } from '../../../../../core/services/external-api/coingecko-api/coingecko-api.service';
import { Web3PublicService } from '../../../../../core/services/blockchain/web3-public-service/web3-public.service';
import { BLOCKCHAIN_NAME } from '../../../../../shared/models/blockchain/BLOCKCHAIN_NAME';
import { UseTestingModeService } from '../../../../../core/services/use-testing-mode/use-testing-mode.service';
import { UniswapAbstract } from '../uniswap-abstract/uniswap-abstract';
import {
  ethToTokensEstimatedGas,
  tokensToEthEstimatedGas,
  tokensToTokensEstimatedGas
} from '../uni-swap-service/uni-swap-constants';

@Injectable()
export class QuickSwapService extends UniswapAbstract {
  constructor(
    coingeckoApiService: CoingeckoApiService,
    web3Private: Web3PrivateService,
    web3Public: Web3PublicService,
    useTestingModeService: UseTestingModeService
  ) {
    super(useTestingModeService, WETH, uniSwapContracts, routingProviders, maxTransitTokens, abi);
    this.coingeckoApiService = coingeckoApiService;
    this.slippageTolerance = 0.015; // 1.5%
    this.tokensToTokensEstimatedGas = tokensToTokensEstimatedGas;
    this.tokensToEthEstimatedGas = tokensToEthEstimatedGas;
    this.ethToTokensEstimatedGas = ethToTokensEstimatedGas;
    this.web3Private = web3Private;
    this.web3Public = web3Public[BLOCKCHAIN_NAME.MATIC];
    this.blockchain = BLOCKCHAIN_NAME.MATIC;
    this.shouldCalculateGas = false;

    useTestingModeService.isTestingMode.subscribe(value => {
      if (value) {
        this.web3Public = web3Public[BLOCKCHAIN_NAME.MATIC];
      }
    });
  }
}