import { Injectable } from '@angular/core';
import { MetamaskError } from 'src/app/shared/models/errors/provider/MetamaskError';
import { NetworkError } from 'src/app/shared/models/errors/provider/NetworkError';
import { NetworkErrorComponent } from 'src/app/shared/components/network-error/network-error.component';
import { TotalSupplyOverflowError } from 'src/app/shared/models/errors/order-book/TotalSupplyOverflowError';
import { TotalSupplyOverflowErrorComponent } from 'src/app/shared/components/errors/total-supply-overflow-error/total-supply-overflow-error.component';
import { MessageBoxComponent } from 'src/app/shared/components/message-box/message-box.component';
import { RubicError } from 'src/app/shared/models/errors/RubicError';
import { MatDialog } from '@angular/material/dialog';
import { Observable, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { NotSupportedNetworkError } from 'src/app/shared/models/errors/provider/NotSupportedNetwork';
import InsufficientFundsError from '../../../shared/models/errors/instant-trade/InsufficientFundsError';

type ErrorModalTitle = 'error' | 'warning';

interface ErrorData {
  title: ErrorModalTitle;
  [field: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorsService {
  constructor(private dialog: MatDialog, private readonly translateService: TranslateService) {}

  public $throw(error: any, message?: string): Observable<never> {
    console.debug(message || error.message || error.comment);
    return throwError(error);
  }

  public throw(error: any, message?: string): void {
    console.debug(message || error.message || error.comment);
    throw error;
  }

  public showErrorDialog(err) {
    if (!(err instanceof RubicError)) {
      console.debug(err);
      err = new RubicError();
    }
    const translateParams = {} as any;
    if (err instanceof NotSupportedNetworkError) {
      translateParams.networkToChoose = err.networkToChoose;
    }
    if (err instanceof InsufficientFundsError) {
      translateParams.tokenSymbol = err.tokenSymbol;
      translateParams.balance = err.balance;
      translateParams.requiredBalance = err.requiredBalance;
    }
    let data: ErrorData = {
      title: 'error',
      descriptionText:
        this.translateService.instant(err.translateKey, translateParams) || err.message
    };
    if (err instanceof MetamaskError) {
      data.title = 'warning';
    }

    if (err instanceof NetworkError) {
      data = {
        title: 'error',
        descriptionComponentClass: NetworkErrorComponent,
        descriptionComponentInputs: { networkError: err }
      };
    }
    if (err instanceof TotalSupplyOverflowError) {
      data = {
        title: 'error',
        descriptionComponentClass: TotalSupplyOverflowErrorComponent,
        descriptionComponentInputs: { totalSupplyOverflowError: err }
      };
    }
    data.title = this.translateService.instant(`common.${data.title}`);
    this.dialog.open(MessageBoxComponent, {
      width: '400px',
      data
    });
  }
}
