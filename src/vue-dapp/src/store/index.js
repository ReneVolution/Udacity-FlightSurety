import Vue from 'vue'
import Vuex from 'vuex'
import web3ModalStore from '@/store/modules/web3Modal'
import flightSuretyStore from '@/store/modules/flightSurety'
import LogStore from '@/store/modules/logging'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {
    web3Modal: web3ModalStore,
    flightSurety: flightSuretyStore,
    logStore: LogStore,
  },
})
