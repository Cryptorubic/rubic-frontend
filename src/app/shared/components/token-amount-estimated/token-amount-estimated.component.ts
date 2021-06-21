import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Subscription } from 'rxjs';
import { SwapFormService } from '../../../features/swaps/services/swaps-form-service/swap-form.service';

@Component({
  selector: 'app-amount-input',
  templateUrl: './token-amount-estimated.component.html',
  styleUrls: ['./token-amount-estimated.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AmountInputComponent implements OnInit, OnDestroy {
  @Input() set loading(value: boolean) {
    this._loading = value;
    this.hidden = false;
  }

  @Input() disabled: boolean;

  public _loading: boolean;

  public usd: string;

  public tokensAmount: string;

  public formSubscription$: Subscription;

  public hidden: boolean;

  constructor(private swapFormService: SwapFormService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.formSubscription$ =
      this.swapFormService.commonTrade.controls.output.valueChanges.subscribe(output => {
        if (output.toAmount.isNaN()) {
          this.hidden = true;
          this.cdr.detectChanges();
          return;
        }
        this.hidden = false;
        const { toToken } = this.swapFormService.commonTrade.controls.input.value;
        this.tokensAmount = output.toAmount.toFixed();
        this.usd = toToken.price && output.toAmount.multipliedBy(toToken.price).toFixed(2);
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy() {
    this.formSubscription$.unsubscribe();
  }
}