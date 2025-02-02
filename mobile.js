// Gestione menu impostazioni per Mobile
const initMobileSettingsMenu = () => {
  console.log('Initializing mobile settings menu'); // Debug

  const settingsBtn = document.getElementById('settingsBtn');
  const settingsMenu = document.querySelector('.menu-impostazioni');
  const settingsBackBtn = document.getElementById('settingsBackBtn');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const mainSettings = document.getElementById('mainSettings');

  if (!settingsBtn || !settingsMenu) {
    console.error('Missing required elements');
    return;
  }

  // Toggle menu
  settingsBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Settings button touched'); // Debug
    
    if (!window.isSettingsOpen) {
      settingsMenu.classList.add('visible');
      window.isSettingsOpen = true;
      mainSettings.classList.remove('hidden');
    } else {
      settingsMenu.classList.remove('visible');
      window.isSettingsOpen = false;
    }
  }, { passive: false });

  // Gestione opzioni menu
  document.querySelectorAll('.settings-item').forEach(item => {
    item.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const menuType = item.dataset.menu;
      if (!menuType) return;

      const targetMenu = menuType + 'Settings';
      mainSettings.classList.add('hidden');
      document.getElementById(targetMenu).classList.remove('hidden');
      window.currentMenu = targetMenu;
    }, { passive: false });
  });

  // Pulsante indietro
  if (settingsBackBtn) {
    settingsBackBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (window.currentMenu !== 'main') {
        document.getElementById(window.currentMenu).classList.add('hidden');
        mainSettings.classList.remove('hidden');
        window.currentMenu = 'main';
      }
    }, { passive: false });
  }

  // Pulsante chiudi
  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      settingsMenu.classList.remove('visible');
      window.isSettingsOpen = false;
    }, { passive: false });
  }

  // Previeni chiusura quando si tocca il menu
  settingsMenu.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  }, { passive: false });

  // Chiudi quando si tocca fuori
  document.addEventListener('touchstart', (e) => {
    if (window.isSettingsOpen && !settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
      settingsMenu.classList.remove('visible');
      window.isSettingsOpen = false;
    }
  }, { passive: true });
}; 