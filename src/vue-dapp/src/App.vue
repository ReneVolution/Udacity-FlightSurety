<template>
  <v-app>
    <v-app-bar app color="indigo" dark height="80px">
      <div class="d-flex align-center">
        <h3 class="text-h3">FlightSurety</h3>
      </div>

      <v-spacer></v-spacer>
      <div>
        <v-btn v-if="web3Modal.active" block large color="indigo darken-4"
          >{{ web3Modal.account.toLowerCase().slice(0, 4) }}…{{
            web3Modal.account
              .toLowerCase()
              .slice(web3Modal.account.toLowerCase().length - 6)
          }}</v-btn
        >
        <v-btn
          v-else
          block
          small
          elevation="2"
          color="indigo darken-4"
          @click="$store.dispatch('connect')"
          >Connect your Wallet</v-btn
        >
      </div>
      <web3-modal-vue
        ref="web3modal"
        :theme="theme"
        :provider-options="providerOptions"
        cache-provider
      />
    </v-app-bar>

    <v-main>
      <ContractStatus />
      <v-row>
        <v-col md="6" sm="12">
          <airlines-grid />
        </v-col>
        <v-col md="6" sm="12">
          <flights-grid />
        </v-col>
      </v-row>
      <v-row>
        <v-col md="6" sm="12">
          <passenger-actions />
        </v-col>
        <v-col md="6" sm="12">
          <admin-actions />
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <log-panel />
        </v-col>
      </v-row>
    </v-main>
  </v-app>
</template>

<script>
import Web3ModalVue from "web3modal-vue";
import AirlinesGrid from "./components/AirlinesGrid.vue";
import ContractStatus from "./components/ContractStatus.vue";
import FlightsGrid from "./components/FlightsGrid.vue";
import PassengerActions from "./components/PassengerActions.vue";
import AdminActions from "./components/AdminActions.vue"
import LogPanel from "./components/LogPanel.vue"

// import WalletConnectProvider from "@walletconnect/web3-provider";
import { web3Modal } from "./config/mixins";

export default {
  name: "App",

  components: {
    Web3ModalVue,
    ContractStatus,
    AirlinesGrid,
    FlightsGrid,
    PassengerActions,
    AdminActions,
    LogPanel
  },
  mixins: [web3Modal],
  data() {
    return {
      theme: "light",
      providerOptions: {
        // walletconnect: {
        //   package: WalletConnectProvider,
        //   options: {
        //     infuraId: "-"
        //   }
        // }
      },
      number: 0,
      balance: 0,
    };
  },
  mounted() {
    this.$nextTick(async () => {
      const web3modal = this.$refs.web3modal;
      this.$store.commit("setWeb3Modal", web3modal);
      if (web3modal.cachedProvider) {
        this.connect();
      }
    });
  },
  methods: {
    connect() {
      this.$store.dispatch("connect");
    },
  },
};
</script>

<style scoped>
#app {
  /* background-image: url("./assets/flight.jpg"); */
  background-color: rgb(238, 238, 238);
  background-size: cover;
  width: 100%;
  height: 100vh;
}
</style>