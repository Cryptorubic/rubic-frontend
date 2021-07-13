import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { IBlockchain } from 'src/app/shared/models/blockchain/IBlockchain';
import Web3 from 'web3';
import { ErrorsService } from 'src/app/core/errors/errors.service';
import { Token } from 'src/app/shared/models/tokens/Token';
import { WalletError } from 'src/app/core/errors/models/provider/WalletError';
import { AccountError } from 'src/app/core/errors/models/provider/AccountError';
import { NetworkError } from 'src/app/core/errors/models/provider/NetworkError';
import { NotSupportedNetworkError } from 'src/app/core/errors/models/provider/NotSupportedNetwork';
import { UseTestingModeService } from 'src/app/core/services/use-testing-mode/use-testing-mode.service';
import { MetamaskProvider } from '../private-provider/metamask-provider/metamask-provider';
import { WalletConnectProvider } from '../private-provider/wallet-connect/wallet-connect-provider';
import { WalletLinkProvider } from '../private-provider/wallet-link/wallet-link-provider';
import { StoreService } from '../../store/store.service';
import { WALLET_NAME } from '../../../header/components/header/components/wallets-modal/models/providers';
import { PrivateProvider } from '../private-provider/private-provider';

@Injectable({
  providedIn: 'root'
})
export class ProviderConnectorService {
  private readonly $networkChangeSubject: BehaviorSubject<IBlockchain>;

  private readonly $addressChangeSubject: BehaviorSubject<string>;

  public providerName: WALLET_NAME;

  private privateProvider: PrivateProvider;

  public get address(): string | undefined {
    return this.provider?.address;
  }

  public get network(): IBlockchain {
    return this.provider.network;
  }

  public get networkName(): BLOCKCHAIN_NAME {
    return this.provider.networkName;
  }

  public get provider(): PrivateProvider {
    return this.privateProvider;
  }

  public set provider(value: PrivateProvider) {
    this.privateProvider = value;
  }

  public get isProviderActive(): boolean {
    return Boolean(this.provider?.isActive);
  }

  public get isProviderInstalled(): boolean {
    return Boolean(this.provider?.isInstalled);
  }

  public get $networkChange(): Observable<IBlockchain> {
    return this.$networkChangeSubject.asObservable();
  }

  public get $addressChange(): Observable<string> {
    return this.$addressChangeSubject.asObservable();
  }

  public readonly web3: Web3;

  constructor(
    private readonly storage: StoreService,
    private readonly errorService: ErrorsService,
    private readonly useTestingModeService: UseTestingModeService
  ) {
    this.web3 = new Web3();
    this.$networkChangeSubject = new BehaviorSubject<IBlockchain>(null);
    this.$addressChangeSubject = new BehaviorSubject<string>(null);
  }

  /**
   * @description Calculates an Ethereum specific signature.
   * @param message Data to sign.
   * @return The signature.
   */
  public async signPersonal(message) {
    return this.web3.eth.personal.sign(message, this.provider.address, undefined);
  }

  /**
   * Setup provider based on local storage.
   */
  public async installProvider(): Promise<void> {
    const provider = this.storage.getItem('provider') as WALLET_NAME;
    await this.connectProvider(provider);
  }

  public async activate(): Promise<void> {
    await this.provider.activate();
    this.storage.setItem('provider', this.provider.name);
  }

  public async requestPermissions(): Promise<any[]> {
    return this.provider.requestPermissions();
  }

  public deActivate(): void {
    this.storage.deleteItem('provider');
    return this.provider.deActivate();
  }

  /**
   * @description opens a window with suggestion to add token to user's wallet
   * @param token token to add
   */
  public addToken(token: Token): Promise<void> {
    return this.provider.addToken(token);
  }

  public async connectProvider(provider: WALLET_NAME, chainId?: number): Promise<void> {
    switch (provider) {
      case WALLET_NAME.WALLET_LINK: {
        this.provider = new WalletLinkProvider(
          this.web3,
          this.$networkChangeSubject,
          this.$addressChangeSubject,
          this.errorService,
          chainId
        );
        break;
      }
      case WALLET_NAME.WALLET_CONNECT: {
        this.provider = new WalletConnectProvider(
          this.web3,
          this.$networkChangeSubject,
          this.$addressChangeSubject,
          this.errorService
        );
        break;
      }
      case WALLET_NAME.METAMASK:
      default: {
        this.provider = new MetamaskProvider(
          this.web3,
          this.$networkChangeSubject,
          this.$addressChangeSubject,
          this.errorService
        ) as PrivateProvider;
        await (this.provider as MetamaskProvider).setupDefaultValues();
      }
    }
    this.providerName = provider;
  }

  public async connectDefaultProvider(): Promise<void> {
    this.provider = new MetamaskProvider(
      this.web3,
      this.$networkChangeSubject,
      this.$addressChangeSubject,
      this.errorService
    ) as PrivateProvider;
    this.providerName = WALLET_NAME.METAMASK;
  }

  public checkSettings(selectedBlockchain: BLOCKCHAIN_NAME): void {
    if (!this.isProviderActive) {
      throw new WalletError();
    }
    if (!this.address) {
      throw new AccountError();
    }

    const isTestingMode = this.useTestingModeService.isTestingMode.getValue();
    if (
      this.networkName !== selectedBlockchain ||
      (isTestingMode && this.networkName !== `${selectedBlockchain}_TESTNET`)
    ) {
      if (this.providerName === WALLET_NAME.METAMASK) {
        throw new NetworkError(selectedBlockchain);
      } else {
        throw new NotSupportedNetworkError(selectedBlockchain);
      }
    }
  }
}
