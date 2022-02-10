<template>
  <v-card
    class="mx-auto"
    max-width="90%"
  >
    <v-card-title
      class="blue-grey white--text"
    >
      <span class="text-h6">Logs</span>
    </v-card-title>
    <v-card-text class="py-0">
      <v-timeline dense>
        <v-slide-x-reverse-transition
          group
          hide-on-leave
        >
          <v-timeline-item
            v-for="item in items"
            :key="item.id"
            :color="item.level"
            small
            fill-dot
          >
            <v-alert
              :value="true"
              :color="item.level"
              :icon="item.icon"
              class="white--text"
            >
            {{item.message}}
            </v-alert>
          </v-timeline-item>
        </v-slide-x-reverse-transition>
      </v-timeline>
    </v-card-text>
  </v-card>
  
</template>

<script>
import { mapGetters } from "vuex";
  const ICONS_MAP = {
    info: 'fa4 fa-info-circle',
    warning: 'fa4 fa-exclamation-triangle',
    error: 'fa4 fa-exclamation-circle',
  }
export default {
  name: "LogPanel",
  data() {
    return {
    }
  },
  computed: {
    ...mapGetters("logStore", ["logs"]),
    items() {
      return this.logs.map(l => {
        return {
          ...l,
          icon: ICONS_MAP[l.level],
        };
      })
    }
  },
};
</script>