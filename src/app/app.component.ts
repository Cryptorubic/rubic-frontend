import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { filter, first } from 'rxjs/operators';
import { HealthcheckService } from './core/services/backend/healthcheck/healthcheck.service';
import { QueryParams } from './core/services/query-params/models/query-params';
import { QueryParamsService } from './core/services/query-params/query-params.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  public isBackendAvailable: boolean;

  constructor(
    private readonly healthcheckService: HealthcheckService,
    private readonly translateService: TranslateService,
    private readonly cookieService: CookieService,
    private readonly queryParamsService: QueryParamsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  public ngOnInit() {
    this.route.queryParams.subscribe((queryParams: QueryParams) => {
      this.queryParamsService.setupQueryParams(queryParams);
      this.setupLanguage(queryParams.lang);
    });
    this.healthcheckService
      .healthCheck()
      .then(isAvailable => (this.isBackendAvailable = isAvailable));
  }

  private setupLanguage(queryParamLang): void {
    const supportedLanguages = ['en', 'ko', 'ru', 'zh', 'es'];
    let userRegionLanguage = navigator.language?.split('-')[0];
    userRegionLanguage = supportedLanguages.includes(userRegionLanguage)
      ? userRegionLanguage
      : 'en';
    let lng;
    if (queryParamLang && supportedLanguages.includes(queryParamLang)) {
      lng = queryParamLang;
    } else {
      lng = this.cookieService.get('lng') || userRegionLanguage;
    }
    this.translateService.setDefaultLang(lng);
    this.translateService.use(lng);
    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        first()
      )
      .subscribe(() => {
        this.router.navigate([], {
          queryParams: { lang: lng },
          queryParamsHandling: 'merge'
        });
      });
  }
}
