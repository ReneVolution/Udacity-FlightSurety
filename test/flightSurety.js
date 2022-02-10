var Test = require('../config/testConfig.js')
var BigNumber = require('bignumber.js')
var ethers = require('ethers')
var truffleAssert = require('truffle-assertions')

contract('Flight Surety Tests', async (accounts) => {
  var config
  beforeEach('setup contract', async () => {
    config = await Test.Config(accounts)
    await config.flightSuretyData.authorizeCaller(
      config.flightSuretyApp.address,
    )
  })

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`Contract has correct initial isOperational() value`, async function () {
    // Get operating status
    const status = await config.flightSuretyApp.isOperational()
    assert.equal(status, true, 'Incorrect initial operating status value')
  })

  it(`Contracts have a shared isOperational() status`, async function () {
    // Ensure initial status is equal
    let status = await config.flightSuretyApp.isOperational()
    assert.equal(status, true, 'Incorrect initial operating status value')

    // Change status to the opposite status
    const changeState = !status
    await config.flightSuretyApp.setOperatingStatus(changeState, {
      from: config.owner,
    })

    let appStatus = await config.flightSuretyApp.isOperational()
    let dataStatus = await config.flightSuretyData.isOperational()

    assert.equal(
      appStatus,
      dataStatus,
      'isOperational() status should be equal in both contracts.',
    )

    // Ensure the contract is active for next tests
    const revertedState = true
    await config.flightSuretyApp.setOperatingStatus(revertedState, {
      from: config.owner,
    })

    appStatus = await config.flightSuretyApp.isOperational()
    dataStatus = await config.flightSuretyData.isOperational()

    assert.equal(
      appStatus,
      dataStatus,
      'isOperational() status should be reverted to equal in both contracts.',
    )
  })

  it(`First airline is registered when contract is deployed`, async () => {
    const airlines = await config.flightSuretyApp.getAirlines()
    assert.equal(airlines.length, 1, 'There should exist a single airline only')

    const firstAirlineAddress = airlines[0]

    const airlineStatusKey = await config.flightSuretyApp.getAirlineStatus(
      firstAirlineAddress,
    )

    assert.equal(airlineStatusKey, 'Registered', 'First airline not registered')
  })

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      })
    } catch (e) {
      accessDenied = true
    }
    assert.equal(accessDenied, true, 'Access not restricted to Contract Owner')
  })

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false
    try {
      await config.flightSuretyData.setOperatingStatus(false)
    } catch (e) {
      accessDenied = true
    }
    assert.equal(accessDenied, false, 'Access not restricted to Contract Owner')
  })

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    await config.flightSuretyData.setOperatingStatus(false)

    let reverted = false
    try {
      await config.flightSurety.setTestingMode(true)
    } catch (e) {
      reverted = true
    }
    assert.equal(reverted, true, 'Access not blocked for requireIsOperational')

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true)
  })

  it(`(multiparty) only existing airlines can add additional airlines`, async function () {
    let accessDenied = false
    try {
      await config.flightSuretyData.addAirline(
        'Magic Airs',
        config.testAddresses[2],
        {
          from: config.owner,
        },
      )
    } catch (e) {
      accessDenied = true
    }
    assert.equal(accessDenied, true, 'Access not restricted to Airlines')
  })

  it('(airline) cannot add an Airline using addAirline() if it is not funded', async () => {
    // ARRANGE
    const { airlines } = config

    // ACT
    try {
      await config.flightSuretyApp.addAirline(
        airlines.two.name,
        airlines.two.address,
        {
          from: airlines.one.address,
        },
      )
    } catch (e) {}
    let result = await config.flightSuretyData.isAirline.call(
      airlines.two.address,
    )

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding",
    )
  })

  it('(airline) can add an Airline using addAirline() upon funding', async () => {
    // ARRANGE
    let { airlines } = config

    const minDeposit = await config.flightSuretyApp.AIRLINE_MIN_FUNDING_DEPOSIT.call()
    await config.flightSuretyApp.addFunds({
      from: airlines.one.address,
      value: minDeposit,
    })

    // ACT
    try {
      await config.flightSuretyApp.addAirline(
        airlines.two.name,
        airlines.two.address,
        {
          from: airlines.one.address,
        },
      )
    } catch (e) {
      console.error(e)
    }
    let result = await config.flightSuretyData.isAirline(airlines.two.address)

    // ASSERT
    assert.equal(
      result,
      true,
      'Airline should be able to register another airline if it has provided initial funding',
    )
  })

  it('(airline) can only nominate new airlines once 4 or more airlines are registered', async () => {
    // ARRANGE
    let result
    const { airlines } = config

    const minDeposit = await config.flightSuretyApp.AIRLINE_MIN_FUNDING_DEPOSIT.call()
    await config.flightSuretyApp.addFunds({
      from: airlines.one.address,
      value: minDeposit,
    })

    // Adding second airline - first airline already being registered
    await config.flightSuretyApp.addAirline(
      airlines.two.name,
      airlines.two.address,
      {
        from: airlines.one.address,
      },
    )

    result = await config.flightSuretyApp.getAirlineStatus(airlines.two.address)
    assert.equal(result, 'Registered', 'Airline 2 should be registered')

    // Adding third airline
    await config.flightSuretyApp.addAirline(
      airlines.three.name,
      airlines.three.address,
      {
        from: airlines.one.address,
      },
    )

    result = await config.flightSuretyApp.getAirlineStatus(
      airlines.three.address,
    )
    assert.equal(result, 'Registered', 'Airline 3 should be registered')

    // Adding fourth airline
    await config.flightSuretyApp.addAirline(
      airlines.four.name,
      airlines.four.address,
      {
        from: airlines.one.address,
      },
    )

    result = await config.flightSuretyApp.getAirlineStatus(
      airlines.four.address,
    )
    assert.equal(result, 'Registered', 'Airline 4 should be registered')

    // Adding fifth airline
    await config.flightSuretyApp.addAirline(
      airlines.five.name,
      airlines.five.address,
      {
        from: airlines.one.address,
      },
    )

    result = await config.flightSuretyApp.getAirlineStatus(
      airlines.five.address,
    )
    assert.equal(result, 'New', 'Airline 5 should be nominated only')
  })

  it('(airline) number 5 is registered after 3 registered airlines approve', async () => {
    // ARRANGE
    let result
    const { airlines } = config

    const minDeposit = await config.flightSuretyApp.AIRLINE_MIN_FUNDING_DEPOSIT.call()
    await config.flightSuretyApp.addFunds({
      from: airlines.one.address,
      value: minDeposit,
    })

    // Airline 2
    await config.flightSuretyApp.addAirline(
      airlines.two.name,
      airlines.two.address,
      {
        from: airlines.one.address,
      },
    )

    await config.flightSuretyApp.addFunds({
      from: airlines.two.address,
      value: minDeposit,
    })

    // Airline 3
    await config.flightSuretyApp.addAirline(
      airlines.three.name,
      airlines.three.address,
      {
        from: airlines.one.address,
      },
    )

    await config.flightSuretyApp.addFunds({
      from: airlines.three.address,
      value: minDeposit,
    })

    // Airline 4
    await config.flightSuretyApp.addAirline(
      airlines.four.name,
      airlines.four.address,
      {
        from: airlines.one.address,
      },
    )

    await config.flightSuretyApp.addFunds({
      from: airlines.four.address,
      value: minDeposit,
    })

    // Airline 5
    await config.flightSuretyApp.addAirline(
      airlines.five.name,
      airlines.five.address,
      {
        from: airlines.one.address,
      },
    )

    // Before approvals
    result = await config.flightSuretyApp.getAirlineStatus(
      airlines.five.address,
    )
    assert.equal(result, 'New', 'Airline 5 should be nominated only')

    // Do approvals
    await config.flightSuretyApp.approveAirline(airlines.five.address, {
      from: airlines.two.address,
    })

    await config.flightSuretyApp.approveAirline(airlines.five.address, {
      from: airlines.three.address,
    })

    // After approvals
    let existingAirlines = await config.flightSuretyApp.getAirlines()
    assert.equal(
      existingAirlines.length,
      5,
      'Contract should contain 5 airlines',
    )

    let airlineData = await config.flightSuretyApp.getAirlineData(
      airlines.five.address,
    )
    let approvalCount = airlineData[4]
    assert.equal(
      new BigNumber(approvalCount).toNumber(),
      3,
      'Airline should have collected 3 approvals',
    )

    result = await config.flightSuretyApp.getAirlineStatus(
      airlines.five.address,
    )
    assert.equal(
      result,
      'Registered',
      'Airline 5 be registered after consensus',
    )
  })

  it('(flights) funded airline can register flights', async () => {
    // ARRANGE
    let result
    const { airlines } = config

    const minDeposit = await config.flightSuretyApp.AIRLINE_MIN_FUNDING_DEPOSIT.call()
    await config.flightSuretyApp.addFunds({
      from: airlines.one.address,
      value: minDeposit,
    })

    const flightData = {
      code: 'AB-100',
      departure: new Date().getTime(),
    }

    await config.flightSuretyApp.registerFlight(
      airlines.one.address,
      flightData.code,
      flightData.departure,
      { from: airlines.one.address },
    )
  })

  it('(passenger) can buy insurance for a flight', async () => {
    // ARRANGE
    let result
    const { airlines, passengers } = config

    const minDeposit = await config.flightSuretyApp.AIRLINE_MIN_FUNDING_DEPOSIT.call()
    await config.flightSuretyApp.addFunds({
      from: airlines.one.address,
      value: minDeposit,
    })

    const flightData = {
      code: 'AB-100',
      departure: new Date().getTime(),
    }

    await config.flightSuretyApp.registerFlight(
      airlines.one.address,
      flightData.code,
      flightData.departure,
      { from: airlines.one.address },
    )

    const wei = ethers.utils.parseEther('1.0')
    await config.flightSuretyApp.buyFlightInsurance(
      airlines.one.address,
      flightData.code,
      flightData.departure,
      { from: passengers.bob.address, value: wei },
    )
  })

  it('(passenger) can only buy on existing flights', async () => {
    // ARRANGE
    let result
    const { airlines, passengers } = config

    const minDeposit = await config.flightSuretyApp.AIRLINE_MIN_FUNDING_DEPOSIT.call()
    await config.flightSuretyApp.addFunds({
      from: airlines.one.address,
      value: minDeposit,
    })

    const flightData = {
      code: 'Not-existing-flight',
      departure: new Date().getTime(),
    }

    const wei = ethers.utils.parseEther('1.0')
    await truffleAssert.reverts(
      config.flightSuretyApp.buyFlightInsurance(
        airlines.one.address,
        flightData.code,
        flightData.departure,
        { from: passengers.bob.address, value: wei },
      ),
      'Flight is not registered.',
    )
  })

  it('(passenger) cant buy insurance for more than 1 eth', async () => {
    // ARRANGE
    let result
    const { airlines, passengers } = config

    const minDeposit = await config.flightSuretyApp.AIRLINE_MIN_FUNDING_DEPOSIT.call()
    await config.flightSuretyApp.addFunds({
      from: airlines.one.address,
      value: minDeposit,
    })

    const flightData = {
      code: 'AB-100',
      departure: new Date().getTime(),
    }

    await config.flightSuretyApp.registerFlight(
      airlines.one.address,
      flightData.code,
      flightData.departure,
      { from: airlines.one.address },
    )

    const wei = ethers.utils.parseEther('1.01')
    await truffleAssert.reverts(
      config.flightSuretyApp.buyFlightInsurance(
        airlines.one.address,
        flightData.code,
        flightData.departure,
        { from: passengers.bob.address, value: wei },
      ),
      'Exceeding max insurance volume.',
    )
  })
})
