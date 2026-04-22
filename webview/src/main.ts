import { createApp } from 'vue';
import {
  NButton,
  NCard,
  NConfigProvider,
  NEmpty,
  NInput,
  NModal,
  NSelect,
  NSpin,
  NTabPane,
  NTabs,
  NTag
} from 'naive-ui';
import App from './App.vue';
import './styles.css';

const app = createApp(App);

app.component('NButton', NButton);
app.component('NCard', NCard);
app.component('NConfigProvider', NConfigProvider);
app.component('NEmpty', NEmpty);
app.component('NInput', NInput);
app.component('NModal', NModal);
app.component('NSelect', NSelect);
app.component('NSpin', NSpin);
app.component('NTabPane', NTabPane);
app.component('NTabs', NTabs);
app.component('NTag', NTag);

app.mount('#app');
