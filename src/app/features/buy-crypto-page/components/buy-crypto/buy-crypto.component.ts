import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-buy-crypto',
  templateUrl: './buy-crypto.component.html',
  styleUrls: ['./buy-crypto.component.scss']
})
export class BuyCryptoComponent implements OnInit {
  public iframeUrl: SafeUrl;

  private currentLang: string;

  constructor(
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private location: Location
  ) {}

  ngOnInit() {
    this.currentLang = this.translateService.currentLang;
    this.translateService.onLangChange.subscribe((langChangeEvent: LangChangeEvent) => {
      this.currentLang = langChangeEvent.lang;
      this.setIframeUrl();
    });

    this.setIframeUrl();
  }

  public setIframeUrl(): void {
    const moonpayBaseUrl = 'https://buy.moonpay.com/';
    const moonpayQueryParams = '?apiKey=pk_live_6PhCJIs0Dwd4nM74DoHw3TZLPRmIqK'
      .concat('&defaultCurrencyCode=eth')
      .concat('&colorCode=%234aa956')
      .concat(`&language=${this.currentLang}`);
    this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      moonpayBaseUrl.concat(moonpayQueryParams)
    );
  }

  public goOnPreviousPage(): void {
    this.location.back();
  }
}
