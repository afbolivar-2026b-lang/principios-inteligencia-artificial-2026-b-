// Aplica el tema elegido antes de pintar la pantalla, para que no parpadee.
try { var t = localStorage.getItem('nova-tema'); if (t === 'claro' || t === 'oscuro') document.documentElement.dataset.theme = t } catch (e) {}
