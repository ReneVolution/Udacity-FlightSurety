<template>
  <div>
    <h2 class="text-h2 mx-3">Airlines</h2>
    <v-form ref="form">
      <v-container>
        <v-row align="center" justify="center">
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.name"
              label="Airline name"
              required
            ></v-text-field>
          </v-col>
          <v-spacer />
          <v-col cols="12" md="4">
            <v-text-field
              v-model="form.address"
              label="Airline address"
              required
            ></v-text-field>
          </v-col>

          <v-col cols="12" md="4">
            <v-btn color="primary" @click="addAirline"> Add Airline </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-form>
    <v-data-table
      :headers="headers"
      :items="airlines"
      :items-per-page="5"
      class="elevation-3 my-2 mx-3"
    >
      <template v-slot:[`item.action`]="{ item }">
        <v-btn
          v-if="item.status == 'New'"
          primary
          align="center"
          justify="center"
          @click="approveAirline(item.address)"
          >Endorse</v-btn
        >
        <v-btn
          v-if="item.status == 'Registered'"
          primary
          align="center"
          justify="center"
          @click="fund"
          >Fund</v-btn
        >
      </template>
    </v-data-table>
  </div>
</template>

<script>
// import { getFlightSuretyAppContract } from "@/utils/contract";
import { mapActions, mapState } from "vuex";

export default {
  name: "AirlinesGrid",
  data() {
    return {
      form: {
        address: null,
        name: null,
      },
      headers: [
        {
          text: "Name",
          value: "name",
        },
        {
          text: "Address",
          value: "address",
        },
        {
          text: "Status",
          value: "status",
        },
        {
          text: "Votes",
          value: "votes",
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
    ...mapState("flightSurety", ["airlines"])
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
    this.$store.dispatch("flightSurety/getAirlines");
  },
  methods: {
    addAirline() {
      this.$store.dispatch("flightSurety/addAirline", {
        name: this.form.name,
        address: this.form.address,
      });
    },
    fund() {
      this.$store.dispatch("flightSurety/fund");
    },
    approveAirline(airlineAddress) {
      this.$store.dispatch("flightSurety/approveAirline", airlineAddress);
    },
    clearForm() {
      this.form.name = "";
      this.form.address = "";
    },
  },
  actions: {
    ...mapActions("flightSurety", {
      getAirlines: "getAirlines",
      addAirline: "addAirline",
    }),
  },
};
</script>