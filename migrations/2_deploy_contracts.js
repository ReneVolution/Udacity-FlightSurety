const FlightSuretyApp = artifacts.require('FlightSuretyApp')
const FlightSuretyData = artifacts.require('FlightSuretyData')
const fs = require('fs').promises

module.exports = async (deployer, network, accounts) => {
  const contractOwner = accounts[0]
  const firstAirline = accounts[1]

  await deployer.deploy(FlightSuretyData, 'Airline One', firstAirline, {
    from: contractOwner,
  })
  await deployer.deploy(FlightSuretyApp, FlightSuretyData.address, {
    from: contractOwner,
  })

  let flightSuretyData = await FlightSuretyData.deployed()
  await flightSuretyData.authorizeCaller(FlightSuretyApp.address, {
    from: contractOwner,
  })

  let flightSuretyApp = await FlightSuretyApp.deployed()

  console.log(`Data address: ${flightSuretyData.address}`)
  console.log(`App address: ${flightSuretyApp.address}`)
  console.log(`First airline address: ${firstAirline}`)

  const config = {
    localhost: {
      url: 'http://localhost:8545',
      dataAddress: flightSuretyData.address,
      appAddress: flightSuretyApp.address,
      network: network,
      accounts: accounts,
    },
  }

  await fs.writeFile(
    __dirname + '/../src/server/config.json',
    JSON.stringify(config, null, '\t'),
    'utf-8',
  )
  await fs.writeFile(
    __dirname + '/../src/dapp/config.json',
    JSON.stringify(config, null, '\t'),
    'utf-8',
  )
  await fs.writeFile(
    __dirname + '/../src/vue-dapp/config.json',
    JSON.stringify(config, null, '\t'),
    'utf-8',
  )
}
