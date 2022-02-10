<template>
  <div class="wrapper d-flex justify-end mr-4">
    <v-switch label="Operational" color="indigo" v-model="activeToggle" @change="toggleOperational"></v-switch>
  </div>
</template>

<script>
import {getFlightSuretyAppContract} from "@/utils/contract";

export default {
  name: "ContractStatus",
  data() {
    return {
      timer: null,
      activeToggle: false,
      isActive: false,
    }
  },
  mounted() {
    this.$nextTick(async () => {
      this.updateIsOperational();
      this.timer = setInterval(() => {
        this.updateIsOperational()
      }, 10000)


    })
  },
  methods: {
    async updateIsOperational() {
      try {
        this.isActive = await getFlightSuretyAppContract('localhost')['isOperational']();
        this.activeToggle = this.isActive;
    } catch (error) {
        console.error(error)
      }
    },

    async toggleOperational() {
      try {
        const newStatus = !this.isActive;
        console.log(`Set operational status to: ${newStatus}`);
        const tx = await getFlightSuretyAppContract('localhost')['setOperatingStatus'](!this.isActive);
        const receipt = await tx.wait();
        console.log(receipt);
        await this.updateIsOperational();
      } catch (err) {
        console.error(err);
      }
    }
  }
}
</script>