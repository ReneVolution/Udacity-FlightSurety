import 'font-awesome/css/font-awesome.min.css'
import Vue from 'vue'
import Vuetify from 'vuetify/lib/framework'
import DatetimePicker from 'vuetify-datetime-picker'

Vue.use(Vuetify)
Vue.use(DatetimePicker)

export default new Vuetify({
  icons: {
    iconfont: 'fa4',
  },
})
