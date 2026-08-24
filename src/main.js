import { mount } from './ui/app.js';
import { Sfx } from './systems/Sfx.js';

document.addEventListener('click', () => Sfx.unlock(), { once: true });
mount(document.getElementById('app'));
