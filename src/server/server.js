import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json'
import Config from './config.json'
import Web3 from 'web3'
import express from 'express'

let config = Config['localhost']
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')),
)
web3.eth.defaultAccount = web3.eth.accounts[0]
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress,
)

// Flight status codes
const STATUS_CODE_UNKNOWN = 0
const STATUS_CODE_ON_TIME = 10
const STATUS_CODE_LATE_AIRLINE = 20
const STATUS_CODE_LATE_WEATHER = 30
const STATUS_CODE_LATE_TECHNICAL = 40
const STATUS_CODE_LATE_OTHER = 50
const STATUS_CODES = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER,
]

const NUM_ORACLES = 20
const ORACLES_ACCOUNTS_OFFSET = 10
const oracles = []

function getRandomStatusCode() {
  if (process.env.FORCE_LATE_AIRLINE) {
    return STATUS_CODE_LATE_AIRLINE
  } else {
    return STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)]
  }
}

flightSuretyApp.events.OracleRequest({ fromBlock: 0 }, function (error, event) {
  if (error) {
    console.log(error)
  } else {
    const { index, airline, flight, timestamp } = event.returnValues
    const statusCode = getRandomStatusCode()

    for (let oracle of oracles) {
      if (oracle.indexes.includes(index)) {
        console.log(`${oracle.indexes} include ${index}`)
        flightSuretyApp.methods
          .submitOracleResponse(index, airline, flight, timestamp, statusCode)
          .send(
            { from: oracle.address, gas: 5000000, gasPrice: 20000000 },
            (error, result) => {
              if (error) {
                console.log(error)
              } else {
                console.log(
                  `Oracle ${oracle.address} submitted status code ${statusCode}`,
                )
              }
            },
          )
      }
    }
  }
})

function getOracleAccounts() {
  return new Promise((resolve, reject) => {
    web3.eth
      .getAccounts()
      .then((accounts) => {
        let oracleAccounts = accounts.slice(
          ORACLES_ACCOUNTS_OFFSET,
          ORACLES_ACCOUNTS_OFFSET + NUM_ORACLES,
        )
        resolve(oracleAccounts)
      })
      .catch((err) => {
        reject(err)
      })
  })
}

function initOracles(accounts) {
  return new Promise((resolve, reject) => {
    flightSuretyApp.methods
      .REGISTRATION_FEE()
      .call()
      .then((fee) => {
        for (let address of accounts) {
          flightSuretyApp.methods
            .registerOracle()
            .send({
              from: address,
              value: fee,
              gas: 5000000,
              gasPrice: 20000000,
            })
            .then(() => {
              // get indexes
              flightSuretyApp.methods
                .getMyIndexes()
                .call({
                  from: address,
                })
                .then((indexes) => {
                  console.log(
                    `Oracle registered at ${address} with [${indexes}] indexes.`,
                  )
                  oracles.push({ address, indexes })
                  resolve(true)
                })
                .catch((err) => {
                  reject(err)
                })
            })
            .catch((err) => {
              reject(err)
            })
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}

getOracleAccounts().then((accounts) => {
  initOracles(accounts).catch((err) => {
    console.log(err.message)
  })
})

const app = express()
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!',
  })
})

export default app
