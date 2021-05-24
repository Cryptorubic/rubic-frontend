import Web3 from 'web3';
import { BehaviorSubject } from 'rxjs';
import { NetworkError } from 'src/app/shared/models/errors/provider/NetworkError';
import SwapToken from 'src/app/shared/models/tokens/SwapToken';
import { WALLET_NAME } from 'src/app/core/header/components/header/components/wallets-modal/wallets-modal.component';
import { PrivateProvider } from '../private-provider';

import { BlockchainsInfo } from '../../blockchain-info';
import { IBlockchain } from '../../../../../shared/models/blockchain/IBlockchain';
import { MetamaskError } from '../../../../../shared/models/errors/provider/MetamaskError';

export class MetamaskProvider extends PrivateProvider {
  private isEnabled = false;

  private readonly core: any;

  private selectedAddress: string;

  private selectedChain: string;

  public readonly onAddressChanges: BehaviorSubject<string>;

  public readonly onNetworkChanges: BehaviorSubject<IBlockchain>;

  get isInstalled(): boolean {
    return !!this.core;
  }

  get isActive(): boolean {
    return this.isEnabled && !!this.selectedAddress;
  }

  public get name(): WALLET_NAME {
    return WALLET_NAME.METAMASK;
  }

  constructor(
    web3: Web3,
    chainChange: BehaviorSubject<IBlockchain>,
    accountChange: BehaviorSubject<string>
  ) {
    super();
    this.onAddressChanges = accountChange;
    this.onNetworkChanges = chainChange;

    const { ethereum } = window as any;
    if (!ethereum) {
      console.error('No Metamask installed.');
      return;
    }

    web3.setProvider(ethereum);
    this.core = ethereum;
    if ((web3.currentProvider as any)?.isMetaMask) {
      this.core.request({ method: 'eth_chainId' }).then((chain: string) => {
        this.selectedChain = chain;
        chainChange.next(BlockchainsInfo.getBlockchainById(chain));
      });
      this.core.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        [this.selectedAddress] = accounts;
        accountChange.next(this.selectedAddress);
      });

      this.core.on('chainChanged', (chain: string) => {
        this.selectedChain = chain;
        if (this.isEnabled) {
          chainChange.next(BlockchainsInfo.getBlockchainById(chain));
          console.info('Chain changed', chain);
        }
      });

      this.core.on('disconnect', () => {
        this.selectedChain = null;
        this.deActivate();
      });

      this.core.on('accountsChanged', (accounts: string[]) => {
        this.selectedAddress = accounts[0] || null;
        if (this.isEnabled) {
          this.onAddressChanges.next(this.selectedAddress);
          console.info('Selected account changed to', accounts[0]);
        }
        if (!this.selectedAddress) {
          this.selectedChain = null;
          this.deActivate();
        }
      });
    } else {
      console.error('Selected other provider.');
    }
  }

  protected getAddress(): string {
    if (this.isEnabled) {
      return this.selectedAddress;
    }
    return null;
  }

  protected getNetwork(): IBlockchain {
    if (this.isEnabled) {
      return this.selectedChain ? BlockchainsInfo.getBlockchainById(this.selectedChain) : undefined;
    }
    return null;
  }

  public async activate(params?: any[]): Promise<void> {
    try {
      await this.core.request({
        method: 'eth_requestAccounts',
        params
      });
      this.isEnabled = true;
      this.onNetworkChanges.next(this.getNetwork());
      this.onAddressChanges.next(this.getAddress());
    } catch (error) {
      console.error(`No Metamask installed. ${error}`);
      throw new MetamaskError();
    }
  }

  public async requestPermissions(): Promise<any[]> {
    try {
      return this.core.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
    } catch (err) {
      console.error(err);
    }
    return null;
  }

  public deActivate(): void {
    this.onAddressChanges.next(null);
    this.onNetworkChanges.next(null);
    this.isEnabled = false;
  }

  public addToken(token: SwapToken): Promise<void> {
    if (!this.isActive) {
      throw new MetamaskError();
    }
    if (this.getNetwork().name !== token.blockchain) {
      throw new NetworkError(token.blockchain);
    }

    return this.core.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          image: token.image
        }
      }
    });
  }
}