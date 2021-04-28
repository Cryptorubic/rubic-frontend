import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { TokensTableService } from 'src/app/shared/models/order-book/tokens-table';

@Injectable({
  providedIn: 'root'
})
export class InstantTradesTableService extends TokensTableService {
  private readonly $blockchainMode: BehaviorSubject<BLOCKCHAIN_NAME>;

  constructor() {
    super();
    this.$blockchainMode = new BehaviorSubject<BLOCKCHAIN_NAME>(BLOCKCHAIN_NAME.ETHEREUM);
  }

  public setBlockchain(blockchain: BLOCKCHAIN_NAME): void {
    this.$blockchainMode.next(blockchain);
  }

  public filterTable(): void {
    const filterBaseValue = this.$filterBaseValue.value?.toLowerCase();
    const filterQuoteValue = this.$filterQuoteValue.value?.toLowerCase();
    const blockChain = this.$blockchainMode.value;
    this.$visibleTableData.next(
      this.$dataSource.value.filter(
        trade => trade.blockchain === blockChain && trade.token.from.blockchain
      )
    );
    if (filterBaseValue) {
      const filteredData = this.$visibleTableData.value.filter(
        row => row.token.from.symbol.toLowerCase() === filterBaseValue
      );
      this.$visibleTableData.next(filteredData);
    }
    if (filterQuoteValue) {
      const filteredData = this.$visibleTableData.value.filter(
        row => row.token.to.symbol.toLowerCase() === filterQuoteValue
      );
      this.$visibleTableData.next(filteredData);
    }
  }

  public hasData(): Observable<boolean> {
    return this.$dataSource.pipe(
      map(data => data.filter(d => d.blockchain === this.$blockchainMode.getValue()).length > 0)
    );
  }
}