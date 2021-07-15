import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { Transaction } from 'web3-core';
import { IBlockchain } from 'src/app/shared/models/blockchain/IBlockchain';
import { BLOCKCHAIN_NAME } from 'src/app/shared/models/blockchain/BLOCKCHAIN_NAME';
import { BlockchainTokenExtended } from 'src/app/shared/models/tokens/BlockchainTokenExtended';
import { AbiItem } from 'web3-utils';
import { BlockTransactionString } from 'web3-eth';
import ERC20_TOKEN_ABI from '../constants/erc-20-abi';
import MULTICALL_ABI from '../constants/multicall-abi';
import { Call } from '../types/call';
import { MULTICALL_ADDRESSES, MULTICALL_ADDRESSES_TESTNET } from '../constants/multicall-addresses';
import { UseTestingModeService } from '../../use-testing-mode/use-testing-mode.service';
import { NATIVE_TOKEN_ADDRESS } from 'src/app/shared/constants/blockchain/NATIVE_TOKEN_ADDRESS';

export class Web3Public {
  private multicallAddresses: { [k in BLOCKCHAIN_NAME]?: string };

  constructor(
    private web3: Web3,
    private blockchain: IBlockchain,
    useTestingModeService: UseTestingModeService
  ) {
    this.multicallAddresses = MULTICALL_ADDRESSES;

    useTestingModeService.isTestingMode.subscribe(isTestingMode => {
      if (isTestingMode) {
        this.multicallAddresses = MULTICALL_ADDRESSES_TESTNET;
      }
    });
  }

  public get batchRequest() {
    return new this.web3.BatchRequest();
  }

  public get nativeTokenAddress(): string {
    return NATIVE_TOKEN_ADDRESS;
  }

  /**
   * @description gets information about token through ERC-20 token contract
   * @param tokenAddress address of the smart-contract corresponding to the token
   * @param blockchain platform of the token
   * @return object, with written token fields, or a error, if there's no such token
   */
  public getTokenInfo: (tokenAddress: string) => Promise<BlockchainTokenExtended> =
    this.getTokenInfoCachingDecorator();

  /**
   * @description gets account balance in Eth units
   * @param address wallet address whose balance you want to find out
   * @param [options] additional options
   * @param [options.inWei = false] boolean flag to get integer result in Wei
   * @return account balance in Eth (or in Wei if options.inWei === true)
   */
  public async getBalance(address: string, options: { inWei?: boolean } = {}): Promise<BigNumber> {
    const balance = await this.web3.eth.getBalance(address);
    return new BigNumber(options.inWei ? balance : this.weiToEth(balance));
  }

  public async getTokenOrNativeBalance(userAddress: string, tokenAddress): Promise<BigNumber> {
    let balance;
    if (this.isNativeAddress(tokenAddress)) {
      balance = await this.web3.eth.getBalance(userAddress);
    } else {
      balance = await this.getTokenBalance(userAddress, tokenAddress);
    }
    return new BigNumber(balance);
  }

  public getBlock(): Promise<BlockTransactionString> {
    return this.web3.eth.getBlock('latest');
  }

  /**
   * @description gets ERC-20 tokens balance as integer (multiplied to 10 ** decimals)
   * @param tokenAddress address of the smart-contract corresponding to the token
   * @param address wallet address whose balance you want to find out
   * @return account tokens balance as integer (multiplied to 10 ** decimals)
   */
  public async getTokenBalance(address: string, tokenAddress: string): Promise<BigNumber> {
    const contract = new this.web3.eth.Contract(ERC20_TOKEN_ABI as AbiItem[], tokenAddress);

    const balance = await contract.methods.balanceOf(address).call();
    return new BigNumber(balance);
  }

  /**
   * @description predicts the volume of gas required to execute the contract method
   * @param contractAbi abi of smart-contract
   * @param contractAddress address of smart-contract
   * @param methodName method whose execution gas number is to be calculated
   * @param methodArguments arguments of the executed contract method
   * @param fromAddress the address for which the gas calculation will be called
   * @param [value] The value transferred for the call “transaction” in wei.
   * @return The gas amount estimated
   */
  public async getEstimatedGas(
    contractAbi: AbiItem[],
    contractAddress: string,
    methodName: string,
    methodArguments: unknown[],
    fromAddress: string,
    value?: string | BigNumber
  ): Promise<BigNumber> {
    const contract = new this.web3.eth.Contract(contractAbi, contractAddress);

    const gasLimit = await contract.methods[methodName](...methodArguments).estimateGas({
      from: fromAddress,
      gas: 40000000,
      ...(value && { value })
    });
    return new BigNumber(gasLimit);
  }

  /**
   * @description calculates the average price per unit of gas according to web3
   * @return average gas price in ETH
   */
  public async getGasPriceInETH(): Promise<BigNumber> {
    const gasPrice = await this.web3.eth.getGasPrice();
    return new BigNumber(gasPrice).div(10 ** 18);
  }

  /**
   * @description calculates the gas fee using average price per unit of gas according to web3 and Eth price according to coingecko
   * @param gasLimit gas limit
   * @param etherPrice price of Eth unit
   * @return gas fee in usd$
   */
  public async getGasFee(gasLimit: BigNumber, etherPrice: BigNumber): Promise<BigNumber> {
    const gasPrice = await this.getGasPriceInETH();
    return gasPrice.multipliedBy(gasLimit).multipliedBy(etherPrice);
  }

  /**
   * @description executes allowance method in ERC-20 token contract
   * @param tokenAddress address of the smart-contract corresponding to the token
   * @param spenderAddress wallet or contract address, allowed to spend
   * @param ownerAddress wallet address to spend from
   * @return tokens amount, allowed to be spent
   */
  public async getAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string
  ): Promise<BigNumber> {
    const contract = new this.web3.eth.Contract(ERC20_TOKEN_ABI as AbiItem[], tokenAddress);

    const allowance = await contract.methods
      .allowance(ownerAddress, spenderAddress)
      .call({ from: ownerAddress });
    return new BigNumber(allowance);
  }

  /**
   * @description gets mined transaction gas fee in Ether
   * @param hash transaction hash
   * @param [options] additional options
   * @param [options.inWei = false] if true, then the return value will be in Wei
   * @return transaction gas fee in Ether (or in Wei if options.inWei = true) or null if transaction is not mined
   */
  public async getTransactionGasFee(
    hash: string,
    options: { inWei?: boolean } = {}
  ): Promise<BigNumber> {
    const transaction = await this.getTransactionByHash(hash);
    const receipt = await this.web3.eth.getTransactionReceipt(hash);

    if (!transaction || !receipt) {
      return null;
    }

    const gasPrice = new BigNumber(transaction.gasPrice);
    const gasLimit = new BigNumber(receipt.gasUsed);

    return options.inWei
      ? gasPrice.multipliedBy(gasLimit)
      : gasPrice.multipliedBy(gasLimit).div(10 ** 18);
  }

  public async getTransactionByHash(
    hash: string,
    attempt?: number,
    attemptsLimit?: number,
    delay?: number
  ): Promise<Transaction> {
    attempt = attempt || 0;
    const limit = attemptsLimit || 10;
    const timeout = delay || 500;

    if (attempt >= limit) {
      return null;
    }

    const transaction = await this.web3.eth.getTransaction(hash);
    if (transaction === null) {
      return new Promise(resolve =>
        setTimeout(() => resolve(this.getTransactionByHash(hash, attempt + 1)), timeout)
      );
    }
    return transaction;
  }

  /**
   * @description checks if a given address is a valid Ethereum address
   * @param address the address to check validity
   */
  public isAddressCorrect(address: string) {
    return this.web3.utils.isAddress(address);
  }

  /**
   * @description converts Eth amount into Wei
   * @param value to convert in Eth
   */
  public ethToWei(value: string | BigNumber): string {
    return this.web3.utils.toWei(value.toString(), 'ether');
  }

  /**
   * @description converts Wei amount into Eth
   * @param value to convert in Wei
   */
  public weiToEth(value: string | BigNumber): string {
    return this.web3.utils.fromWei(value.toString(), 'ether');
  }

  /**
   * @description checks if address is Ether native address
   * @param address address to check
   */
  public isNativeAddress = (address: string): boolean => {
    return address === NATIVE_TOKEN_ADDRESS;
  };

  /**
   * @description call smart-contract pure method of smart-contract and returns its output value
   * @param contractAddress address of smart-contract which method is to be executed
   * @param contractAbi abi of smart-contract which method is to be executed
   * @param methodName calling method name
   * @param [options] additional options
   * @param [options.from] the address the call “transaction” should be made from
   * @param [options.methodArguments] executing method arguments
   * @return smart-contract pure method returned value
   */
  public async callContractMethod(
    contractAddress: string,
    contractAbi: AbiItem[],
    methodName: string,
    options: {
      methodArguments?: unknown[];
      from?: string;
    } = { methodArguments: [] }
  ): Promise<string | string[]> {
    const contract = new this.web3.eth.Contract(contractAbi, contractAddress);

    return contract.methods[methodName](...options.methodArguments).call({
      ...(options.from && { from: options.from })
    });
  }

  private getTokenInfoCachingDecorator(): (
    tokenAddress: string
  ) => Promise<BlockchainTokenExtended> {
    const tokensCache: { [address: string]: BlockchainTokenExtended } = {};

    return async (tokenAddress: string): Promise<BlockchainTokenExtended> => {
      if (!tokensCache[tokenAddress]) {
        tokensCache[tokenAddress] = await this.callForTokenInfo(tokenAddress);
      }

      return tokensCache[tokenAddress];
    };
  }

  private async callForTokenInfo(tokenAddress: string): Promise<BlockchainTokenExtended> {
    if (this.isNativeAddress(tokenAddress)) {
      return {
        ...this.blockchain.nativeCoin,
        blockchain: this.blockchain.name
      };
    }

    const tokenMethods = ['decimals', 'symbol', 'name', 'totalSupply'];
    const tokenFieldsPromises = tokenMethods.map((method: string) =>
      this.callContractMethod(tokenAddress, ERC20_TOKEN_ABI as AbiItem[], method)
    );
    const token: BlockchainTokenExtended = {
      blockchain: this.blockchain.name,
      address: tokenAddress
    } as BlockchainTokenExtended;

    (await Promise.all(tokenFieldsPromises)).forEach(
      (elem, index) => (token[tokenMethods[index]] = elem)
    );

    token.decimals = Number(token.decimals);

    return token;
  }

  public async getTokensBalances(address: string, tokenAddresses: string[]): Promise<BigNumber[]> {
    const contract = new this.web3.eth.Contract(ERC20_TOKEN_ABI as AbiItem[], tokenAddresses[0]);
    const indexOfNativeCoin = tokenAddresses.findIndex(this.isNativeAddress);
    const promises = [];

    if (indexOfNativeCoin !== -1) {
      tokenAddresses.splice(indexOfNativeCoin, 1);
      promises[1] = this.getBalance(address, { inWei: true });
    }
    const calls: Call[] = tokenAddresses.map(tokenAddress => ({
      target: tokenAddress,
      callData: contract.methods.balanceOf(address).encodeABI()
    }));
    promises[0] = this.multicall(calls);

    const results = await Promise.all(promises);
    const tokensBalances = results[0].map(hexBalance => new BigNumber(hexBalance));

    if (indexOfNativeCoin !== -1) {
      tokensBalances.splice(indexOfNativeCoin, 0, results[1]);
    }

    return tokensBalances;
  }

  public async multicallContractMethod<Output>(
    contractAddress: string,
    contractAbi: AbiItem[],
    methodName: string,
    methodCallsArguments: (string | number)[][]
  ): Promise<Output[]> {
    const contract = new this.web3.eth.Contract(contractAbi, contractAddress);
    const calls: Call[] = methodCallsArguments.map(callArguments => ({
      callData: contract.methods[methodName](...callArguments).encodeABI(),
      target: contractAddress
    }));

    const outputs = await this.multicall(calls);

    const methodOutputAbi = contractAbi.find(
      funcSignature => funcSignature.name === methodName
    ).outputs;

    return outputs.map(
      outputHex => this.web3.eth.abi.decodeParameters(methodOutputAbi, outputHex) as Output
    );
  }

  private async multicall(calls: Call[]): Promise<string[]> {
    const contract = new this.web3.eth.Contract(
      MULTICALL_ABI as AbiItem[],
      this.multicallAddresses[this.blockchain.name]
    );
    const result = await contract.methods.aggregate(calls).call();
    return result.returnData;
  }
}
