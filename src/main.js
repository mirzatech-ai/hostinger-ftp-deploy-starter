import './style.css';

const el = document.getElementById('msg');
el.textContent = `This site was built at ${new Date().toLocaleString()}. Edit src/main.js and rebuild.`;
