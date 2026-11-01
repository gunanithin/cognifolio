import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (target) {
  target.innerHTML = '';
}

const app = mount(App, {
  target: target || document.body,
});

export default app;
