import { ethers } from 'ethers'

import {
  getFlightSuretyAppContract,
  getFlightSuretyDataContract,
} from '@/utils/contract'
import { web3Modal } from '../../config/mixins'

const flightSuretyStore = {
  namespaced: true,
  state: {
    airlines: [],
    flights: [],
    balance: null,
  },
  getters: {
    appContract: () => getFlightSuretyAppContract('localhost'),
    dataContract: () => getFlightSuretyDataContract('localhost'),
    availableAirlines: (state) => state.airlines.map((a) => a.address),
    flights: (state) => state.flights,
    claimableBalance: (state) => `${state.balance} Ξ`,
  },
  mutations: {
    setAirlines(state, airlines) {
      state.airlines = airlines
    },
    setFlights(state, flights) {
      state.flights = flights
    },
    setBalance(state, balance) {
      state.balance = balance
    },
  },
  actions: {
    getFlights: async ({ getters, commit }) => {
      // Fetch all flight keys
      const flightKeys = await getters.appContract['getFlights']()

      // Fetch FLight data for all flights
      const flightsData = await Promise.all(
        flightKeys.map((key) => {
          return getters.appContract['getFlightData'](key)
        }),
      )

      const res = flightsData.map((flight) => {
        console.log(flight)
        return {
          airlineAddress: flight[0],
          code: flight[1],
          scheduledTimestamp: new Date(
            new ethers.utils.BigNumber(flight[2]).toNumber(),
          ).toISOString(),
          status: flight[3],
          isProcessed: flight[4],
        }
      })

      // commit to state
      commit('setFlights', res)
    },
    addFlight: async ({ getters, dispatch }, flightData) => {
      const { airlineAddress, flightCode, scheduledTimestamp } = flightData
      try {
        const tx = await getters.appContract['registerFlight'](
          airlineAddress,
          flightCode,
          scheduledTimestamp,
        )
        await tx.wait()
        dispatch('getFlights')
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'info',
            message: `Adding Flight ${flightCode} for Airline ${airlineAddress} and departure ${scheduledTimestamp}.`,
          },
          { root: true },
        )
      } catch (err) {
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'error',
            message: `Failed to add Flight ${flightCode}. Error: ${
              err.data?.message || err.message
            }.`,
          },
          { root: true },
        )
      }
    },
    approveAirline: async ({ getters, dispatch }, airlineAddress) => {
      try {
        const tx = await getters.appContract['approveAirline'](airlineAddress)
        tx.wait()
        dispatch('getAirlines')
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'info',
            message: `Airline ${airlineAddress} approved by ${web3Modal.state.account}.`,
          },
          { root: true },
        )
      } catch (err) {
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'error',
            message: `Failed to approve ${airlineAddress}. Error: ${
              err.data?.message || err.message
            }`,
          },
          { root: true },
        )
      }
    },
    addAirline: async ({ getters, dispatch }, airlineData) => {
      const { name, address } = airlineData
      try {
        const tx = await getters.appContract['addAirline'](name, address)
        await tx.wait()
        // Refresh view
        dispatch('getAirlines')
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'info',
            message: `Added Airline ${name} (${address}).`,
          },
          { root: true },
        )
      } catch (err) {
        console.error(err)
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'error',
            message: `Failed to add Airline ${name} (${address}). Error: ${
              err.data?.message || err.message
            }`,
          },
          { root: true },
        )
      }
    },
    getAirlines: async ({ getters, commit }) => {
      // Fetch all airline addresses
      const airlineAddresses = await getters.appContract['getAirlines']()
      // Fetch AirlineData for all airlines
      const airlineData = await Promise.all(
        airlineAddresses.map((airlineAddress) => {
          return getters.appContract['getAirlineData'](airlineAddress)
        }),
      )

      const res = airlineData.map((airline) => {
        return {
          name: airline[0],
          address: airline[1],
          status: airline[2],
          funds: airline[3],
          votes: airline[4],
        }
      })
      // commit to state
      commit('setAirlines', res)
    },
    fund: async ({ getters, dispatch }) => {
      try {
        const registrationFee = await getters.appContract[
          'AIRLINE_MIN_FUNDING_DEPOSIT'
        ]()
        const tx = await getters.appContract['addFunds']({
          value: registrationFee,
        })
        await tx.wait()
        dispatch('getAirlines')

        dispatch(
          'logStore/addLogEvent',
          {
            level: 'info',
            message: `Added funding for airline.`,
          },
          { root: true },
        )
      } catch (err) {
        console.error(err)
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'error',
            message: `Failed to to add fundings to Airline. Error: ${
              err.data?.message || err.message
            }`,
          },
          { root: true },
        )
      }
    },
    updateClaimableBalance: async ({ getters, commit }) => {
      const curBalance = await getters.appContract['getWithdrawableBalance']()
      console.log(`Current claimable balance: ${curBalance}`)
      commit('setBalance', ethers.utils.formatEther(curBalance))
    },
    claimRefunds: async ({ getters, dispatch }) => {
      try {
        const claimTx = await getters.appContract['claimRefunds']()
        await claimTx.wait()
        dispatch('updateClaimableBalance')
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'info',
            message: `Successfully claimed refunds.`,
          },
          { root: true },
        )
      } catch (err) {
        console.error(err)
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'error',
            message: `Failed to claim insurance refunds. Error: ${
              err.data?.message || err.message
            }`,
          },
          { root: true },
        )
      }
    },
    fetchFlightStatus: async ({ getters, dispatch }, data) => {
      const { airlineAddress, flightCode, scheduledTimestamp } = data
      try {
        const tx = await getters.appContract['fetchFlightStatus'](
          airlineAddress,
          flightCode,
          scheduledTimestamp,
        )
        await tx.wait()
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'info',
            message: `Fetching Flight status for Flight ${flightCode} at ${scheduledTimestamp}.`,
          },
          { root: true },
        )
      } catch (err) {
        console.error(err)
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'error',
            message: `Failed to fetch status for Flight ${flightCode} at ${scheduledTimestamp}. Error: ${
              err.data?.message || err.message
            }`,
          },
          { root: true },
        )
      }

      dispatch('getFlights')
    },
    buyInsurance: async ({ getters, dispatch }, data) => {
      const {
        airlineAddress,
        flightCode,
        scheduledTimestamp,
        insuranceAmount,
      } = data
      try {
        const tx = await getters.appContract['buyFlightInsurance'](
          airlineAddress,
          flightCode,
          scheduledTimestamp,
          {
            value: ethers.utils.parseEther(insuranceAmount),
          },
        )
        await tx.wait()
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'info',
            message: `Bought insurance for Flight ${flightCode} with amount: ${insuranceAmount}.`,
          },
          { root: true },
        )
      } catch (err) {
        console.error(err)
        dispatch(
          'logStore/addLogEvent',
          {
            level: 'error',
            message: `Failed to buy insurance for Flight ${flightCode} with amount: ${insuranceAmount}. Error: ${
              err.data?.message || err.message
            }`,
          },
          { root: true },
        )
      }
    },
  },
}

export default flightSuretyStore
