import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  INJECTOR,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { PolymorpheusComponent } from '@tinkoff/ng-polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';
import { Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { WalletsModalComponent } from 'src/app/core/header/components/header/components/wallets-modal/wallets-modal.component';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { FormService } from 'src/app/shared/models/swaps/FormService';
import { TokenAmount } from 'src/app/shared/models/tokens/TokenAmount';
import BigNumber from 'bignumber.js';
import { TokensService } from 'src/app/core/services/tokens/tokens.service';
import { ISwapFormInput } from 'src/app/shared/models/swaps/ISwapForm';
import { ProviderConnectorService } from 'src/app/core/services/blockchain/provider-connector/provider-connector.service';
import { UseTestingModeService } from 'src/app/core/services/use-testing-mode/use-testing-mode.service';
import { TranslateService } from '@ngx-translate/core';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { BridgeService } from 'src/app/features/bridge/services/bridge-service/bridge.service';
import { WALLET_NAME } from 'src/app/core/header/components/header/components/wallets-modal/models/providers';
import { TRADE_STATUS } from '../../../models/swaps/TRADE_STATUS';

enum ERROR_TYPE {
  INSUFFICIENT_FUNDS = 'Insufficient balance',
  WRONG_BLOCKCHAIN = 'Wrong user network',
  NOT_SUPPORTED_BRIDGE = 'Not supported bridge',
  TRON_WALLET_ADDRESS = 'TRON wallet address is not set',
  NOT_SELECTED_PROVIDER = 'Provider is not selected'
}

@Component({
  selector: 'app-swap-button',
  templateUrl: './swap-button.component.html',
  styleUrls: ['./swap-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SwapButtonComponent implements OnInit, OnDestroy {
  @Input() needApprove: boolean;

  @Input() status: TRADE_STATUS;

  @Input() formService: FormService;

  @Input() set fromAmount(value: BigNumber) {
    this._fromAmount = value;
    this.checkInsufficientFundsError();
  }

  @Input() set isBridgeNotSupported(value: boolean) {
    this.errorType[ERROR_TYPE.NOT_SUPPORTED_BRIDGE] = value || false;
  }

  @Input() set isTronAddressNotSet(value: boolean) {
    this.errorType[ERROR_TYPE.TRON_WALLET_ADDRESS] = value;
  }

  @Input() set providerError(value: boolean) {
    this.errorType[ERROR_TYPE.NOT_SELECTED_PROVIDER] = value;
  }

  @Output() approveClick = new EventEmitter<void>();

  @Output() swapClick = new EventEmitter<void>();

  @Output() loginEvent = new EventEmitter<void>();

  public TRADE_STATUS = TRADE_STATUS;

  public needLogin: Observable<boolean>;

  public loading: boolean;

  public errorType: Record<ERROR_TYPE, boolean>;

  private isTestingMode: boolean;

  private fromToken: TokenAmount;

  private _fromAmount: BigNumber;

  private useTestingModeSubscription$: Subscription;

  private formServiceSubscription$: Subscription;

  private providerConnectorServiceSubscription$: Subscription;

  get hasError(): boolean {
    return !!Object.values(ERROR_TYPE).find(key => this.errorType[key]);
  }

  public get allowChangeNetwork(): boolean {
    const unsupportedItBlockchains = [BLOCKCHAIN_NAME.XDAI, BLOCKCHAIN_NAME.TRON];
    const form = this.formService.commonTrade.controls.input.value;
    if (
      this.providerConnectorService?.providerName !== WALLET_NAME.METAMASK ||
      !form.fromBlockchain
    ) {
      return false;
    }

    if (form.toBlockchain === form.fromBlockchain) {
      return !unsupportedItBlockchains.some(el => el === form.fromBlockchain);
    }
    return this.bridgeService.isBridgeSupported();
  }

  public get networkErrorText(): void {
    return this.translateService.instant('common.switchTo', {
      networkName: this.formService.commonTrade.controls.input.value.fromBlockchain
    });
  }

  // eslint-disable-next-line consistent-return
  get errorText(): string {
    if (this.errorType[ERROR_TYPE.NOT_SUPPORTED_BRIDGE]) {
      return this.translateService.instant('errors.chooseSupportedBridge');
    }
    if (this.errorType[ERROR_TYPE.INSUFFICIENT_FUNDS]) {
      return this.translateService.instant('errors.InsufficientBalance');
    }
    if (this.errorType[ERROR_TYPE.TRON_WALLET_ADDRESS]) {
      return this.translateService.instant('errors.setTronAddress');
    }
    if (this.errorType[ERROR_TYPE.WRONG_BLOCKCHAIN]) {
      return this.translateService.instant('errors.chooseNetworkWallet', {
        blockchain: this.fromToken?.blockchain || ''
      });
    }
    if (this.errorType[ERROR_TYPE.NOT_SELECTED_PROVIDER]) {
      return this.translateService.instant('errors.noSelectedProvider');
    }
  }

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly authService: AuthService,
    private readonly tokensService: TokensService,
    private readonly providerConnectorService: ProviderConnectorService,
    private readonly useTestingModeService: UseTestingModeService,
    private readonly dialogService: TuiDialogService,
    @Inject(INJECTOR) private readonly injector: Injector,
    private translateService: TranslateService,
    private readonly bridgeService: BridgeService
  ) {
    this.errorType = Object.values(ERROR_TYPE).reduce(
      (acc, key) => ({
        ...acc,
        [key]: false
      }),
      {}
    ) as Record<ERROR_TYPE, boolean>;
  }

  ngOnInit(): void {
    this.needApprove = false;
    this.needLogin = this.authService.getCurrentUser().pipe(map(user => !user?.address));

    this.loading = true;

    this.useTestingModeSubscription$ = this.useTestingModeService.isTestingMode.subscribe(
      isTestingMode => {
        this.isTestingMode = isTestingMode;
      }
    );

    this.setFormValues(this.formService.commonTrade.controls.input.value);
    this.formServiceSubscription$ =
      this.formService.commonTrade.controls.input.valueChanges.subscribe(form => {
        this.setFormValues(form);
      });

    this.providerConnectorServiceSubscription$ =
      this.providerConnectorService.$networkChange.subscribe(() => {
        this.checkWrongBlockchainError();
      });
  }

  ngOnDestroy(): void {
    this.useTestingModeSubscription$?.unsubscribe();
    this.formServiceSubscription$?.unsubscribe();
    this.providerConnectorServiceSubscription$?.unsubscribe();
  }

  private setFormValues(form: ISwapFormInput): void {
    this.fromToken = form.fromToken;
    this.checkErrors();
  }

  private checkErrors(): void {
    this.checkInsufficientFundsError();
    this.checkWrongBlockchainError();
  }

  private checkInsufficientFundsError(): void {
    if (!this._fromAmount || !this.fromToken) {
      this.errorType[ERROR_TYPE.INSUFFICIENT_FUNDS] = false;
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.errorType[ERROR_TYPE.INSUFFICIENT_FUNDS] = this.fromToken.amount.lt(this._fromAmount);

    this.loading = false;
    this.cdr.detectChanges();
  }

  private checkWrongBlockchainError(): void {
    if (this.providerConnectorService.provider) {
      const fromBlockchain = this.fromToken?.blockchain;
      const userBlockchain = this.providerConnectorService.network?.name;

      this.errorType[ERROR_TYPE.WRONG_BLOCKCHAIN] =
        fromBlockchain &&
        userBlockchain &&
        fromBlockchain !== userBlockchain &&
        (!this.isTestingMode || `${fromBlockchain}_TESTNET` !== userBlockchain);

      this.cdr.detectChanges();
    }
  }

  public onLogin() {
    this.dialogService
      .open(new PolymorpheusComponent(WalletsModalComponent, this.injector), { size: 's' })
      .subscribe(() => this.loginEvent.emit());
  }

  public async changeNetwork(): Promise<void> {
    const currentStatus = this.status;
    this.status = TRADE_STATUS.LOADING;
    try {
      await this.providerConnectorService.switchChain(this.fromToken?.blockchain);
    } finally {
      this.status = currentStatus;
    }
  }
}
