const LogStore = {
  namespaced: true,
  state: {
    logEvents: [],
  },
  getters: {
    logs: (state) => state.logEvents,
  },
  mutations: {
    appendLogEvent(state, event) {
      state.logEvents.push({ ...event, id: state.logEvents.length })
    },
  },
  actions: {
    addLogEvent: async ({ commit }, event) => {
      // Fetch all flight keys
      commit('appendLogEvent', event)
    },
  },
}

export default LogStore
