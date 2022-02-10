var HDWalletProvider = require('@truffle/hdwallet-provider')
var mnemonic =
  'other image wheel spirit guard add heavy dove bullet north good toe'

module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*',
      gas: 8000000,
      gasPrice: 20000000000,
      confirmations: 0,
      timeoutBlocks: 50,
      skipDryRun: true,
    },
    rinkeby: {
      // better use private key from secret file
      provider: function () {
        return new HDWalletProvider(mnemonic, 'http://127.0.0.1:8545/', 0, 50)
      },
    },
  },
  compilers: {
    solc: {
      version: '^0.4.24',
    },
  },
}
