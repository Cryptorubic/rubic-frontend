export const contractAddressEthereum = '0x65f6CEb94A15EA06D94aE6a264a1f7E4D32914f5';

export const contractAddressKovan = '0x61386c9764bb2341b5bb7b22599348317eAd6dDb';

export const ABI = [
  {
    inputs: [
      { internalType: 'uint8[]', name: '_networks', type: 'uint8[]' },
      {
        internalType: 'uint128[]',
        name: '_depositSize',
        type: 'uint128[]'
      },
      { internalType: 'uint128[]', name: '_depositFee', type: 'uint128[]' }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'sender', type: 'address' },
      {
        indexed: false,
        internalType: 'uint128',
        name: 'amount',
        type: 'uint128'
      },
      { indexed: false, internalType: 'uint8', name: 'network', type: 'uint8' }
    ],
    name: 'DepositEthMade',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'tokenAddress', type: 'address' },
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address'
      },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      {
        indexed: false,
        internalType: 'uint8',
        name: 'network',
        type: 'uint8'
      }
    ],
    name: 'DepositTokenMade',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'previousOwner', type: 'address' },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address'
      }
    ],
    name: 'OwnershipTransferred',
    type: 'event'
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'network', type: 'uint8' },
      {
        internalType: 'uint128',
        name: '_depositSizeEth',
        type: 'uint128'
      },
      { internalType: 'uint128', name: '_depositFeeEth', type: 'uint128' }
    ],
    name: 'addNetwork',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint8', name: 'network', type: 'uint8' }],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint8', name: 'network', type: 'uint8' }],
    name: 'depositFee',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint8', name: 'network', type: 'uint8' }],
    name: 'depositSize',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
      {
        internalType: 'uint8',
        name: 'network',
        type: 'uint8'
      }
    ],
    name: 'depositToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'network', type: 'uint8' },
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'depositTokenFee',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'network', type: 'uint8' },
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'depositTokenSize',
    outputs: [{ internalType: 'uint128', name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'network', type: 'uint8' },
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address'
      }
    ],
    name: 'forbidTokenDeposits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint8', name: 'network', type: 'uint8' }],
    name: 'removeNetwork',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'network', type: 'uint8' },
      {
        internalType: 'uint128',
        name: 'newFee',
        type: 'uint128'
      }
    ],
    name: 'setDepositFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'network', type: 'uint8' },
      {
        internalType: 'uint128',
        name: '_depositSize',
        type: 'uint128'
      },
      { internalType: 'uint128', name: '_depositFee', type: 'uint128' }
    ],
    name: 'setDepositSettings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint8', name: 'network', type: 'uint8' },
      {
        internalType: 'uint128',
        name: 'newSize',
        type: 'uint128'
      }
    ],
    name: 'setDepositSize',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
      {
        internalType: 'uint8',
        name: 'network',
        type: 'uint8'
      },
      { internalType: 'uint128', name: '_depositSize', type: 'uint128' },
      {
        internalType: 'uint128',
        name: '_depositFee',
        type: 'uint128'
      }
    ],
    name: 'setTokenDepositSettings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenAddress', type: 'address' },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'withdrawToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];
