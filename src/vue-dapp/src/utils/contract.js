import FlightSuretyAppContract from '../../../../build/contracts/FlightSuretyApp.json'
import FlightSuretyDataContract from '../../../../build/contracts/FlightSuretyData.json'
import Config from '../../config.json'
import { ethers } from 'ethers'
import { simpleRpcProvider } from '@/utils/web3'
import store from '@/store'

export const getFlightSuretyAppContract = (network) => {
  let config = Config[network]
  console.log(config)
  const { library } = store.state.web3Modal
  const signer = library.getSigner()
  return getContract(FlightSuretyAppContract.abi, config.appAddress, signer)
}

export const getFlightSuretyDataContract = (network) => {
  let config = Config[network]
  console.log(config)
  const { library } = store.state.web3Modal
  const signer = library.getSigner()
  return getContract(FlightSuretyDataContract.abi, config.dataAddress, signer)
}

const getContract = (abi, address, signer = null) => {
  const signerOrProvider = signer ?? simpleRpcProvider
  return new ethers.Contract(address, abi, signerOrProvider)
}
