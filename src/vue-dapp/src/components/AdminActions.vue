<template>
  <div>
    <h2 class="text-h2 mx-3 mb-4">Admin Actions</h2>
    <v-form ref="form">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="7">
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
          <v-col cols="12" md="5">
            <v-btn color="primary" @click="fetchFlightStatus"> Fetch Flight Status </v-btn>
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
    };
  },
  computed: {
    ...mapGetters("flightSurety", ["flights"]),
  },
  created() {
    this.$store.dispatch("flightSurety/getFlights");
  },
  methods: {
    fetchFlightStatus() {
      const data = {
        airlineAddress: this.selectedFlight.airlineAddress,
        flightCode: this.selectedFlight.code,
        scheduledTimestamp: new Date(this.selectedFlight.scheduledTimestamp).getTime(),
      }
      console.log(JSON.stringify(data));

      this.$store.dispatch("flightSurety/fetchFlightStatus", data);
    },

  },
  actions: {
    ...mapActions("flightSurety", {
      fetchFlightStatus: "fetchFlightStatus"
    }),
  },
};
</script>