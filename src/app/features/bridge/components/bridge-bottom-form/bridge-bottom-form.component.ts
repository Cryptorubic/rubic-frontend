import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  Injector,
  OnDestroy,
  OnInit
} from '@angular/core';
import { forkJoin, of, Subscription } from 'rxjs';
import BigNumber from 'bignumber.js';
import { TuiDialogService, TuiNotification, TuiNotificationsService } from '@taiga-ui/core';
import { debounceTime, first } from 'rxjs/operators';
import { TransactionReceipt } from 'web3-eth';
import { TranslateService } from '@ngx-translate/core';
import { ErrorsService } from 'src/app/core/errors/errors.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { TRADE_STATUS } from 'src/app/shared/models/swaps/TRADE_STATUS';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { SettingsService } from 'src/app/features/swaps/services/settings-service/settings.service';
import { Web3PublicService } from 'src/app/core/services/blockchain/web3-public-service/web3-public.service';
import ADDRESS_TYPE from 'src/app/shared/models/blockchain/ADDRESS_TYPE';
import { UndefinedError } from 'src/app/core/errors/models/undefined.error';
import { NATIVE_TOKEN_ADDRESS } from 'src/app/shared/constants/blockchain/NATIVE_TOKEN_ADDRESS';
import { TokensService } from 'src/app/core/services/tokens/tokens.service';
import { SwapFormService } from '../../../swaps/services/swaps-form-service/swap-form.service';
import { BridgeService } from '../../services/bridge-service/bridge.service';
import { BridgeTradeRequest } from '../../models/BridgeTradeRequest';
import { SwapsService } from '../../../swaps/services/swaps-service/swaps.service';

interface BlockchainInfo {
  name: string;
  href: string;
}

const BLOCKCHAINS_INFO: { [key in BLOCKCHAIN_NAME]?: BlockchainInfo } = {
  [BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN]: {
    name: 'Binance Smart Chain',
    href: 'https://www.binance.org/'
  },
  [BLOCKCHAIN_NAME.POLYGON]: {
    name: 'Polygon',
    href: 'https://polygon.technology/'
  },
  [BLOCKCHAIN_NAME.XDAI]: {
    name: 'xDai',
    href: 'https://www.xdaichain.com/'
  },
  [BLOCKCHAIN_NAME.TRON]: {
    name: 'Tron',
    href: 'https://tron.network/'
  }
};

@Component({
  selector: 'app-bridge-bottom-form',
  templateUrl: './bridge-bottom-form.component.html',
  styleUrls: ['./bridge-bottom-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BridgeBottomFormComponent implements OnInit, OnDestroy {
  public TRADE_STATUS = TRADE_STATUS;

  public BLOCKCHAIN_NAME = BLOCKCHAIN_NAME;

  public ADDRESS_TYPE = ADDRESS_TYPE;

  private formSubscription$: Subscription;

  private settingsSubscription$: Subscription;

  private userSubscription$: Subscription;

  private unsupportedBridgeSubscription$: Subscription;

  private fromBlockchain: BLOCKCHAIN_NAME;

  public toBlockchain: BLOCKCHAIN_NAME;

  public needApprove: boolean;

  public fromAmount: BigNumber;

  public minmaxError = false;

  public tradeStatus = TRADE_STATUS.DISABLED;

  public isBridgeSupported;

  public toWalletAddress: string;

  public tronAddress: string;

  get whatIsBlockchain(): BlockchainInfo {
    const { fromBlockchain, toBlockchain } = this.swapFormService.commonTrade.controls.input.value;
    const nonEthBlockchain =
      toBlockchain === BLOCKCHAIN_NAME.ETHEREUM ? fromBlockchain : toBlockchain;
    return BLOCKCHAINS_INFO[nonEthBlockchain];
  }

  get tokenInfoUrl(): string {
    const { fromToken, toToken } = this.swapFormService.commonTrade.controls.input.value;
    let tokenAddress;
    if (
      toToken?.address &&
      toToken.address !== NATIVE_TOKEN_ADDRESS &&
      this.web3PublicService[BLOCKCHAIN_NAME.ETHEREUM].isAddressCorrect(toToken.address)
    ) {
      tokenAddress = toToken?.address;
    } else {
      tokenAddress = fromToken?.address;
    }
    return tokenAddress ? `t/${tokenAddress}` : '';
  }

  constructor(
    private bridgeService: BridgeService,
    private errorsService: ErrorsService,
    public swapFormService: SwapFormService,
    private swapService: SwapsService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private web3PublicService: Web3PublicService,
    @Inject(TuiDialogService) private readonly dialogService: TuiDialogService,
    private readonly notificationsService: TuiNotificationsService,
    @Inject(Injector) private readonly injector: Injector,
    private readonly translate: TranslateService,
    private readonly tokensService: TokensService
  ) {}

  ngOnInit() {
    this.fromBlockchain = this.swapFormService.commonTrade.controls.input.value.fromBlockchain;
    this.toBlockchain = this.swapFormService.commonTrade.controls.input.value.toBlockchain;

    this.tronAddress = this.settingsService.settingsForm.controls.BRIDGE.value.tronAddress;
    if (this.toBlockchain === BLOCKCHAIN_NAME.TRON) {
      this.toWalletAddress = this.tronAddress;
    }

    this.isBridgeSupported = true;
    this.calculateTrade();

    this.fromAmount = this.swapFormService.commonTrade.controls.input.value.fromAmount;
    this.formSubscription$ = this.swapFormService.commonTrade.controls.input.valueChanges
      .pipe(debounceTime(500))
      .subscribe(form => {
        this.fromAmount = form.fromAmount;

        if (
          this.fromBlockchain !== form.fromBlockchain ||
          this.toBlockchain !== form.toBlockchain
        ) {
          this.isBridgeSupported = true;
          this.unsupportedBridgeSubscription$?.unsubscribe();
        }

        this.toBlockchain = form.toBlockchain;
        if (this.toBlockchain === BLOCKCHAIN_NAME.TRON) {
          this.toWalletAddress = this.tronAddress;
        } else {
          this.toWalletAddress = this.authService.user?.address;
        }

        this.calculateTrade();
        this.cdr.detectChanges();
      });

    this.settingsSubscription$ =
      this.settingsService.settingsForm.controls.BRIDGE.valueChanges.subscribe(settings => {
        this.tronAddress = settings.tronAddress;
        if (this.toBlockchain === BLOCKCHAIN_NAME.TRON) {
          this.toWalletAddress = this.tronAddress;
        }

        this.cdr.detectChanges();
      });

    this.userSubscription$ = this.authService.getCurrentUser().subscribe(user => {
      if (user?.address) {
        if (this.toBlockchain !== BLOCKCHAIN_NAME.TRON) {
          this.toWalletAddress = user.address;
        }

        this.calculateTrade();
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    this.formSubscription$.unsubscribe();
    this.settingsSubscription$.unsubscribe();
    this.userSubscription$.unsubscribe();
    this.unsupportedBridgeSubscription$?.unsubscribe();
  }

  private calculateTrade(): void {
    const { fromBlockchain, toBlockchain, fromToken, toToken, fromAmount } =
      this.swapFormService.commonTrade.controls.input.value;

    if (fromBlockchain === toBlockchain) {
      return;
    }

    if (!this.bridgeService.isBridgeSupported()) {
      this.tradeStatus = TRADE_STATUS.DISABLED;
      if (this.isBridgeSupported) {
        this.isBridgeSupported = false;
        this.unsupportedBridgeSubscription$ = this.notificationsService
          .show(this.translate.instant('errors.notSupportedBridge'), {
            label: this.translate.instant('common.error'),
            status: TuiNotification.Error,
            autoClose: false
          })
          .subscribe();
      }
      return;
    }
    this.isBridgeSupported = true;
    this.unsupportedBridgeSubscription$?.unsubscribe();

    if (
      !fromBlockchain ||
      !toBlockchain ||
      !fromToken ||
      !toToken ||
      !fromAmount ||
      fromAmount.eq(0) ||
      fromAmount.isNaN()
    ) {
      this.swapFormService.commonTrade.controls.output.patchValue({
        toAmount: new BigNumber(NaN)
      });
      this.tradeStatus = TRADE_STATUS.DISABLED;
      return;
    }

    this.tradeStatus = TRADE_STATUS.LOADING;
    this.cdr.detectChanges();

    const needApprove$ = this.authService.user?.address
      ? this.bridgeService.needApprove()
      : of(false);

    forkJoin([this.bridgeService.getFee(), needApprove$]).subscribe(([fee, needApprove]) => {
      this.needApprove = needApprove;

      if (fee === null) {
        this.tradeStatus = TRADE_STATUS.DISABLED;
        this.cdr.detectChanges();
        this.errorsService.catch$(new UndefinedError());
        return;
      }

      const toAmount = fromAmount.minus(fee);
      this.swapFormService.commonTrade.controls.output.patchValue({
        toAmount
      });
      this.tradeStatus = needApprove ? TRADE_STATUS.READY_TO_APPROVE : TRADE_STATUS.READY_TO_SWAP;
      this.minmaxError = !this.swapService.checkMinMax(fromAmount);
      if (
        this.minmaxError ||
        !toAmount ||
        toAmount.isNaN() ||
        toAmount.eq(0) ||
        !this.toWalletAddress
      ) {
        this.tradeStatus = TRADE_STATUS.DISABLED;
      }
      this.cdr.detectChanges();
    });
  }

  public createTrade() {
    this.tradeStatus = TRADE_STATUS.SWAP_IN_PROGRESS;

    let tradeInProgressSubscription$: Subscription;
    const bridgeTradeRequest: BridgeTradeRequest = {
      toAddress: this.toWalletAddress,
      onTransactionHash: () => {
        this.cdr.detectChanges();
        tradeInProgressSubscription$ = this.notificationsService
          .show(this.translate.instant('bridgePage.progressMessage'), {
            label: this.translate.instant('notifications.tradeInProgress'),
            status: TuiNotification.Info,
            autoClose: false
          })
          .subscribe();
      }
    };

    this.bridgeService
      .createTrade(bridgeTradeRequest)
      .pipe(first())
      .subscribe(
        (_: TransactionReceipt) => {
          tradeInProgressSubscription$.unsubscribe();
          this.notificationsService
            .show(this.translate.instant('bridgePage.successMessage'), {
              label: this.translate.instant('notifications.successfulTradeTitle'),
              status: TuiNotification.Success,
              autoClose: 15000
            })
            .subscribe();

          this.tradeStatus = null;
          this.cdr.detectChanges();

          this.calculateTrade();

          this.tokensService.recalculateUsersBalance();
        },
        err => {
          tradeInProgressSubscription$?.unsubscribe();
          this.tradeStatus = TRADE_STATUS.READY_TO_SWAP;
          this.errorsService.catch$(err);
          this.cdr.detectChanges();
        }
      );
  }

  public approveTrade() {
    this.tradeStatus = TRADE_STATUS.APPROVE_IN_PROGRESS;

    let approveInProgressSubscription$: Subscription;
    const bridgeTradeRequest: BridgeTradeRequest = {
      onTransactionHash: () => {
        this.cdr.detectChanges();
        approveInProgressSubscription$ = this.notificationsService
          .show(this.translate.instant('bridgePage.approveProgressMessage'), {
            label: this.translate.instant('notifications.approveInProgress'),
            status: TuiNotification.Info,
            autoClose: false
          })
          .subscribe();
      }
    };

    this.bridgeService
      .approve(bridgeTradeRequest)
      .pipe(first())
      .subscribe(
        (_: TransactionReceipt) => {
          approveInProgressSubscription$.unsubscribe();
          this.notificationsService
            .show(this.translate.instant('bridgePage.approveSuccessMessage'), {
              label: this.translate.instant('notifications.successApprove'),
              status: TuiNotification.Success,
              autoClose: 15000
            })
            .subscribe();

          this.tradeStatus = TRADE_STATUS.READY_TO_SWAP;
          this.cdr.detectChanges();

          this.tokensService.recalculateUsersBalance();
        },
        err => {
          approveInProgressSubscription$?.unsubscribe();
          this.tradeStatus = TRADE_STATUS.READY_TO_APPROVE;
          this.errorsService.catch$(err);
          this.cdr.detectChanges();
        }
      );
  }
}
