import { Inject, Injectable, Injector } from '@angular/core';
import { TuiNotification, TuiNotificationsService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@tinkoff/ng-polymorpheus';
import { TranslateService } from '@ngx-translate/core';
import { UndefinedErrorComponent } from 'src/app/core/errors/components/undefined-error/undefined-error.component';
import { RubicError } from 'src/app/core/errors/models/RubicError';

@Injectable({
  providedIn: 'root'
})
export class ErrorsService {
  constructor(
    private readonly notificationsService: TuiNotificationsService,
    @Inject(Injector) private injector: Injector,
    private translateService: TranslateService
  ) {}

  public throw$(error: RubicError): never {
    console.debug(error);

    const options = {
      label: 'Error',
      status: TuiNotification.Error,
      data: {},
      autoClose: 7000
    };

    if (error?.type === 'component') {
      const errorComponent = new PolymorpheusComponent(
        error.component || UndefinedErrorComponent,
        this.injector
      );
      options.data = error?.data;
      this.notificationsService.show(errorComponent, options).subscribe();
      throw error;
    }

    const text = error?.translateKey
      ? this.translateService.instant(error.translateKey)
      : error.message;
    this.notificationsService.show(text, options).subscribe();
    throw error;
  }

  public catch$(error: RubicError): void {
    console.debug(error);

    const options = {
      label: 'Error',
      status: TuiNotification.Error,
      data: {},
      autoClose: 7000
    };

    if (error?.type === 'component') {
      const errorComponent = new PolymorpheusComponent(
        error.component || UndefinedErrorComponent,
        this.injector
      );
      if (error?.data) {
        options.data = error.data;
      }
      this.notificationsService.show(errorComponent, options).subscribe();
      return;
    }

    const text = error?.translateKey
      ? this.translateService.instant(error.translateKey)
      : error.message;
    this.notificationsService.show(text, options).subscribe();
  }
}
