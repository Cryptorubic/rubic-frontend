import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DynamicModule } from 'ng-dynamic-component';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { FooterComponent } from './components/footer/footer.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { ArrowComponent } from './components/arrow/arrow.component';
import { MessageBoxComponent } from './components/message-box/message-box.component';
import { InfoTooltipComponent } from './components/info-tooltip/info-tooltip.component';
import { TooltipComponent } from './components/tooltip/tooltip.component';
import { BlockchainLabelComponent } from './components/blockchains-input/blockchain-label/blockchain-label.component';
import { BlockchainsInputComponent } from './components/blockchains-input/blockchains-input.component';
import { CollaborationsComponent } from './components/collaborations/collaborations.component';
import { CountdownComponent } from './components/countdown/countdown.component';
import { DisclaimerComponent } from './components/disclaimer/disclaimer.component';
import { DropdownSelectComponent } from './components/dropdown-select/dropdown-select.component';
import { InputDropdownComponent } from './components/input-dropdown/input-dropdown.component';
import { ModalComponent } from './components/modal/modal.component';
import { PrimaryButtonComponent } from './components/primary-button/primary-button.component';
import { TokenLabelComponent } from './components/tokens-input/token-label/token-label.component';
import { TokensInputComponent } from './components/tokens-input/tokens-input.component';
import { WhiteButtonComponent } from './components/white-button/white-button.component';
import { BigNumberDirective } from './directives/big-number/big-number.directive';
import { EthAddressDirective } from './directives/eth-address/eth-address.directive';
import { MinMaxDirective } from './directives/minMax/min-max.directive';
import { BigNumberMin } from './pipes/big-number-min.pipe';
import { BigNumberMax } from './pipes/big-number-max.pipe';
import { BigNumberFormat } from './pipes/big-number-format.pipe';
import { CoinsListComponent } from './directives/coins-list/coins-list.component';
import { NativeUrlPipe } from './pipes/native-url.pipe';
import { EtherscanUrlPipe } from './pipes/etherscan-url.pipe';
import { AddressInputComponent } from './components/address-input/address-input.component';
import { WarningLabelComponent } from './components/warning-label/warning-label.component';
import { TokenAddressDirective } from './directives/token-address/token-address.directive';
import { NumberPrecisionDirective } from './directives/number-precision/number-precision.directive';

@NgModule({
  declarations: [
    FooterComponent,
    SpinnerComponent,
    ArrowComponent,
    MessageBoxComponent,
    InfoTooltipComponent,
    TooltipComponent,
    CountdownComponent,
    DisclaimerComponent,
    ModalComponent,
    PrimaryButtonComponent,
    TokensInputComponent,
    CollaborationsComponent,
    DropdownSelectComponent,
    WhiteButtonComponent,
    TokenLabelComponent,
    InputDropdownComponent,
    BlockchainsInputComponent,
    BlockchainLabelComponent,
    EthAddressDirective,
    MinMaxDirective,
    BigNumberDirective,
    BigNumberFormat,
    BigNumberMin,
    BigNumberMax,
    CoinsListComponent,
    EtherscanUrlPipe,
    NativeUrlPipe,
    AddressInputComponent,
    WarningLabelComponent,
    TokenAddressDirective,
    NumberPrecisionDirective
  ],
  imports: [CommonModule, TranslateModule, DynamicModule, MatDialogModule, FormsModule],
  exports: [
    FooterComponent,
    SpinnerComponent,
    ArrowComponent,
    MessageBoxComponent,
    InfoTooltipComponent,
    TooltipComponent,
    CountdownComponent,
    DisclaimerComponent,
    ModalComponent,
    PrimaryButtonComponent,
    TokensInputComponent,
    CollaborationsComponent,
    DropdownSelectComponent,
    WhiteButtonComponent,
    TokenLabelComponent,
    InputDropdownComponent,
    BlockchainsInputComponent,
    BlockchainLabelComponent,
    EthAddressDirective,
    MinMaxDirective,
    BigNumberDirective,
    BigNumberFormat,
    BigNumberMin,
    BigNumberMax,
    CoinsListComponent,
    EtherscanUrlPipe,
    NativeUrlPipe,
    AddressInputComponent,
    WarningLabelComponent,
    TokenAddressDirective,
    TranslateModule,
    NumberPrecisionDirective
  ]
})
export class SharedModule {}