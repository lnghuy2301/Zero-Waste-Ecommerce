import './style.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import Toast, { type PluginOptions, POSITION } from 'vue-toastification'
import 'vue-toastification/dist/index.css'

const app = createApp(App)

const options: PluginOptions = {
  // Bạn có thể cấu hình vị trí và thời gian ở đây
  position: POSITION.TOP_RIGHT,
  timeout: 3000,
  maxToasts: 3,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false,
}

app.use(router)
app.use(Toast, options)
app.mount('#app')
