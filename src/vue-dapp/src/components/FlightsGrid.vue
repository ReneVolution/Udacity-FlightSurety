<template>
  <div>
    <h2 class="text-h2 mx-3">Flights</h2>
    <v-form ref="form">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.flightCode"
              label="Flight"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4">
            <v-datetime-picker ref="dateElement" label="Departure" v-model="form.scheduledTimestamp"> 
              <template slot="dateIcon">
                    <v-icon>fa4 fa-calendar</v-icon>
                  </template>
                  <template slot="timeIcon">
                    <v-icon>fa4 fa-clock-o</v-icon>
                  </template>
            </v-datetime-picker>
          </v-col>
          <v-col cols="12" md="4">
            <v-btn color="primary" @click="addFlight"> Add Flight </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-form>
    <v-data-table
      :headers="headers"
      :items="flights"
      :items-per-page="5"
      class="elevation-3 my-2 mx-3"
    >
      <template v-slot:[`item.action`]="{ item }">
        <v-btn
          v-if="item.status == 'Nominated'"
          primary
          align="center"
          justify="center"
          @click="approveAirline"
          >Endorse</v-btn
        >
      </template>
    </v-data-table>
  </div>
</template>

<script>
import { mapActions, mapGetters, mapState } from "vuex";

export default {
  name: "FlightsGrid",
  data() {
    return {
      form: {
        flightCode: null,
        scheduledTimestamp: null
      },
      headers: [
        {
          text: "Airline",
          value: "airlineAddress",
        },
        {
          text: "Flight",
          value: "code",
        },
        {
          text: "Departure",
          value: "scheduledTimestamp",
        },
        {
          text: "Status",
          value: "status",
        },
        {
          text: "Action",
          value: "action",
        },
      ],
      timer: null,
      activeToggle: false,
      isActive: false,
    };
  },
  computed: {
    ...mapGetters("flightSurety", ["flights", "availableAirlines"]),
    ...mapState("web3Modal", ["web3Modal"])
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
  },
  methods: {
    addFlight() {
      console.log(`Address: ${this.$store.state.web3Modal.account}`)
      this.$store.dispatch("flightSurety/addFlight", {
        airlineAddress: this.$store.state.web3Modal.account,
        flightCode: this.form.flightCode,
        scheduledTimestamp: new Date(this.form.scheduledTimestamp).getTime()
      });
      this.clearForm();
    },

    clearForm() {
      this.form.flightCode = "";
      this.form.scheduledTimestamp = "";
      this.$refs['dateElement'].clearHandler()
    },
  },
  actions: {
    ...mapActions("flightSurety", {
      getFlights: "getFlights",
      addFlight: "addFlight",
    }),
  },
};
</script>