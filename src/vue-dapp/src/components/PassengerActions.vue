<template>
  <div>
    <h2 class="text-h2 mx-3 mb-4">Passenger Actions</h2>
    <v-form ref="form">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedFlight"
              :items="flights"
              item-text="code"
              label="Select Flight"
              hide-details="auto"
              return-object
              outlined
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="insuranceAmount"
              :min="0.0"
              :max="1.0"
              outlined
              hide-details="auto"
              type="number"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-btn color="primary" @click="buyInsurance"> Buy Insurance </v-btn>
          </v-col>
        </v-row>
        <v-row align="center" justify="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="claimableBalance"
              outlined
              disabled
              hide-details="auto"
              type="text"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-btn color="primary" @click="updateClaimable"> Update Claimable </v-btn>
          </v-col>
          <v-col cols="12" md="4">
            <v-btn color="primary" @click="claimRefunds"> Claim Refunds </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-form>
  </div>
</template>

<script>
import { mapActions, mapGetters } from "vuex";

export default {
  name: "PassengerActions",
  data() {
    return {
      selectedFlight: null,
      insuranceAmount: 1.0,
      form: {
        flightCode: null,
        scheduledTimestamp: null
      },
      timer: null,
      activeToggle: false,
      isActive: false,
    };
  },
  computed: {
    ...mapGetters("flightSurety", ["flights", "claimableBalance"]),
  },
  mounted() {
    this.$nextTick(async () => {
      //   this.updateIsOperational();
      //   this.timer = setInterval(() => {
      //     this.updateIsOperational();
      //   }, 10000);
    });
  },
  created() {
    this.$store.dispatch("flightSurety/getFlights");
    this.$store.dispatch("flightSurety/updateClaimableBalance");
  },
  methods: {
    buyInsurance() {
      const data = {
        airlineAddress: this.selectedFlight.airlineAddress,
        flightCode: this.selectedFlight.code,
        scheduledTimestamp: new Date(this.selectedFlight.scheduledTimestamp).getTime(),
        insuranceAmount: this.insuranceAmount.toString()
      }
      console.log(JSON.stringify(data));

      this.$store.dispatch("flightSurety/buyInsurance", data);
      // this.clearForm();
    },

    updateClaimable() {
      this.$store.dispatch("flightSurety/updateClaimableBalance");
    },
    claimRefunds() {
      this.$store.dispatch("flightSurety/claimRefunds");
    },
    clearForm() {
      this.form.flightCode = "";
      this.form.scheduledTimestamp = "";
      this.$refs['dateElement'].clearHandler()
    },
  },
  actions: {
    ...mapActions("flightSurety", {
      buyInsurance: "buyInsurance",
      updateClaimableBalance: "updateClaimableBalance"
    }),
  },
};
</script>