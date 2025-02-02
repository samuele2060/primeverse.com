// Definisci le variabili globali
window.isSettingsOpen = false;
window.currentMenu = 'main';
window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

document.addEventListener('DOMContentLoaded', () => {
  // Prima le variabili DOM
  const video = document.getElementById('videoPlayer');
  const contenitore = document.getElementById('videoContainer');
  const controlli = document.getElementById('controls');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const muteBtn = document.getElementById('muteBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumePercentage = document.getElementById('volumePercentage');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const progressHandle = document.getElementById('progressHandle');
  const bufferProgress = document.getElementById('bufferProgress');
  const currentTimeDisplay = document.getElementById('currentTime');
  const durationDisplay = document.getElementById('duration');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  let settingsBtn = document.getElementById('settingsBtn');
  const settingsMenu = document.querySelector('.menu-impostazioni');
  const skipBackBtn = document.getElementById('skipBackBtn');
  const skipForwardBtn = document.getElementById('skipForwardBtn');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const networkStatus = document.getElementById('networkStatus');
  const playOverlay = document.getElementById('playOverlay');
  const previewContainer = document.getElementById('previewContainer');
  const previewVideo = document.getElementById('previewVideo');
  const previewTime = document.getElementById('previewTime');
  const settingsBackBtn = document.getElementById('settingsBackBtn');
  const mainSettings = document.getElementById('mainSettings');
  const settingsCloseBtn = document.getElementById('settingsCloseBtn');
  const tornaSu = document.getElementById('tornaSu');
  const castBtn = document.getElementById('castBtn');


  // Poi le variabili di stato
  let isPlaying = false;
  let isSeeking = false;
  let hideControlsTimeout;
  let volumeBeforeMute = 1;
  let loadingTimeout = null;
  let isDragging = false;
  let isHovering = false;
  let wasPlaying = false;
  let lastBufferCheck = 0;
  const BUFFER_CHECK_INTERVAL = 1000;
  let castSession = null;
  let isRequestingCast = false;

  // Funzioni di utilità
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const updatePreviewTime = (time) => {
    if (previewTime && !isNaN(time) && isFinite(time)) {
      previewTime.textContent = formatTime(time);
    }
  };

  const showControls = () => {
    controlli.classList.add('visible');
    contenitore.style.cursor = 'default';
    
    if (hideControlsTimeout) {
      clearTimeout(hideControlsTimeout);
    }
    
      hideControlsTimeout = setTimeout(() => {
      if (!isSettingsOpen && !isDragging && !isHovering) {
          controlli.classList.remove('visible');
          contenitore.style.cursor = 'none';
        }
      }, 3000);
  };

  const setWindowFullscreen = (enabled) => {
    if (enabled) {
      contenitore.classList.add('window-fullscreen');
    } else {
      contenitore.classList.remove('window-fullscreen');
    }
  };

  const togglePlay = async () => {
    console.log('Toggle Play Called');
    if (video.paused) {
      console.log('Playing video');
      try {
        await video.play();
        isPlaying = true;
        playPauseBtn.classList.add('playing');
        playOverlay.classList.remove('visible');
      } catch (error) {
        // Ignora l'errore AbortError poiché è normale quando si interrompe la riproduzione
        if (error.name !== 'AbortError') {
          console.error('Errore durante la riproduzione:', error);
        }
      }
    } else {
      console.log('Pausing video');
      video.pause();
      isPlaying = false;
      playPauseBtn.classList.remove('playing');
      playOverlay.classList.add('visible');
    }
    showControls();
  };

  const toggleMute = () => {
    if (video.volume === 0) {
      const newVolume = volumeBeforeMute || 1;
      video.volume = newVolume;
      volumeSlider.value = newVolume;
      muteBtn.classList.remove('muted');
      volumePercentage.textContent = `${Math.round(newVolume * 100)}%`;
      document.documentElement.style.setProperty('--volume-percentage', `${newVolume * 100}%`);
    } else {
      volumeBeforeMute = video.volume;
      video.volume = 0;
      volumeSlider.value = 0;
      muteBtn.classList.add('muted');
      volumePercentage.textContent = '0%';
      document.documentElement.style.setProperty('--volume-percentage', '0%');
    }
  };

  const toggleFullscreenMode = () => {
    if (!isWindowFullscreen && !isBrowserFullscreen) {
      setWindowFullscreen(true);
      isWindowFullscreen = true;
    } else if (isWindowFullscreen && !isBrowserFullscreen) {
      contenitore.requestFullscreen();
      isBrowserFullscreen = true;
      isWindowFullscreen = false;
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setWindowFullscreen(false);
      isWindowFullscreen = false;
      isBrowserFullscreen = false;
    }
  };

  // Definizione delle funzioni principali
  const updateProgress = () => {
    if (!isSeeking) {
        const progress = video.currentTime / video.duration;
        document.documentElement.style.setProperty('--progress-position', progress);
        document.documentElement.style.setProperty('--progress-position-px', `${progress * 100}%`);
        progressFill.style.transform = `scaleX(${progress})`;
        currentTimeDisplay.textContent = formatTime(video.currentTime);
    }
  };

  // Modifica la gestione del buffering e del caricamento
  let lastBufferUpdate = 0;
  const BUFFER_UPDATE_INTERVAL = 3000; // Aggiorna il buffer ogni 3 secondi

  const updateBufferProgress = () => {
    const now = Date.now();
    if (now - lastBufferUpdate < BUFFER_UPDATE_INTERVAL || video.seeking) {
      return;
    }

    if (video.buffered.length > 0) {
      try {
        const buffered = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0 && buffered > 0) {
          const progress = buffered / duration;
          document.documentElement.style.setProperty('--buffer-position', progress);
        }
      } catch (e) {
        // Ignora errori di buffering
      }
      lastBufferUpdate = now;
    }
  };

  // Ottimizza la gestione del timeupdate
  let lastTimeUpdate = 0;
  const TIME_UPDATE_INTERVAL = 250; // Limita gli aggiornamenti a 4 volte al secondo

  video.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastTimeUpdate < TIME_UPDATE_INTERVAL) {
      return;
    }
    
    if (!isDragging && !isHovering) {
      const progress = video.currentTime / video.duration;
      requestAnimationFrame(() => {
        progressFill.style.transform = `scaleX(${progress})`;
        progressHandle.style.left = `${progress * 100}%`;
        currentTimeDisplay.textContent = formatTime(video.currentTime);
      });
    }
    lastTimeUpdate = now;
  });

  // Ottimizza la gestione del loading spinner
  video.addEventListener('waiting', () => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    loadingTimeout = setTimeout(() => {
      if (!video.paused) {
    loadingSpinner.classList.add('visible');
      }
    }, 1000);
  });

  video.addEventListener('playing', () => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    loadingSpinner.classList.remove('visible');
  });

  // Modifica la gestione del mousedown sulla barra di progresso
  progressBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    wasPlaying = !video.paused;
    if (wasPlaying) video.pause();
    
    const rect = progressBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    // Aggiorna il video e la UI
    video.currentTime = pos * video.duration;
    progressFill.style.transform = `scaleX(${pos})`;
    progressHandle.style.left = `${pos * 100}%`;
    
    // Mostra e aggiorna la preview durante il trascinamento
    if (previewContainer && previewVideo) {
      previewContainer.classList.add('visible');
      previewVideo.currentTime = pos * video.duration;
      updatePreviewTime(pos * video.duration);
      
      const previewX = e.clientX - rect.left;
      previewContainer.style.transform = 'translateX(-40%)';
      previewContainer.style.left = `${previewX}px`;
    }
  });

  // Modifica la gestione del click sulla barra di progresso
  progressBar.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = progressBar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    // Aggiorna il tempo del video
    video.currentTime = pos * video.duration;
    
    // Aggiorna la UI
    progressFill.style.transform = `scaleX(${pos})`;
    progressHandle.style.left = `${pos * 100}%`;
    
    // Mostra brevemente la preview
    if (previewContainer && previewVideo) {
      previewContainer.classList.add('visible');
      previewVideo.currentTime = pos * video.duration;
      updatePreviewTime(pos * video.duration);
      
      const previewX = e.clientX - rect.left;
      previewContainer.style.transform = 'translateX(-40%)';
      previewContainer.style.left = `${previewX}px`;
      
      // Nascondi la preview dopo un breve ritardo
      setTimeout(() => {
        previewContainer.classList.remove('visible');
      }, 500);
    }
  });

  // Ora il codice per mobile
  if (isMobile) {
    // Gestione touch per i controlli
    const addTouchHandler = (element, handler) => {
      let touchStartTime = 0;
      
      element.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
      }, { passive: true });
      
      element.addEventListener('touchend', (e) => {
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 300) {
          e.preventDefault();
          handler(e);
        }
      });
    };

    // Aggiungi gli handler touch
    addTouchHandler(playPauseBtn, togglePlay);
    addTouchHandler(fullscreenBtn, toggleFullscreenMode);
    addTouchHandler(settingsBtn, () => {
      document.querySelector('.menu-impostazioni').classList.toggle('visible');
      isSettingsOpen = !isSettingsOpen;
    });
    addTouchHandler(muteBtn, toggleMute);
    addTouchHandler(skipBackBtn, () => {
      video.currentTime = Math.max(0, video.currentTime - 10);
    });
    addTouchHandler(skipForwardBtn, () => {
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
    });

    // Stili ottimizzati per touch (uniti in un unico stile)
    const touchStyle = document.createElement('style');
    touchStyle.textContent = `
      @media (max-width: 768px) {
        .control-button {
          padding: 15px;
        }

        .control-button svg {
          width: 24px;
          height: 24px;
        }

        .controls {
          padding: 15px;
        }

        .progress-container {
          padding: 15px 0;
          touch-action: none;
        }

        .progress-bar {
          height: 8px;
        }

        .progress-handle {
          width: 20px;
          height: 20px;
          transform: translate(-50%, -50%) scale(1);
        }

        .progress-container:active .progress-bar {
          height: 10px;
        }

        .progress-container:active .progress-handle {
          transform: translate(-50%, -50%) scale(1.2);
        }
      }
    `;
    document.head.appendChild(touchStyle);

    // Ottimizza il buffering per mobile
  video.addEventListener('waiting', () => {
    loadingSpinner.classList.add('visible');
  });

    video.addEventListener('canplay', () => {
    loadingSpinner.classList.remove('visible');
  });

    // Disabilita la preview su mobile
    if (previewContainer) {
      previewContainer.style.display = 'none';
    }

    // Modifica la gestione touch per lo slider
    progressBar.addEventListener('touchstart', (e) => {
      isDragging = true;
      wasPlaying = !video.paused;
      if (wasPlaying) video.pause();
      
      const rect = progressBar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
      
      // Aggiorna il video e la UI
      video.currentTime = pos * video.duration;
      progressFill.style.transform = `scaleX(${pos})`;
      progressHandle.style.left = `${pos * 100}%`;
      
      // Mostra e aggiorna la preview durante il trascinamento
      if (previewContainer && previewVideo) {
          previewContainer.classList.add('visible');
          previewVideo.currentTime = pos * video.duration;
          updatePreviewTime(pos * video.duration);
          
          const previewX = e.touches[0].clientX - rect.left;
          previewContainer.style.transform = 'translateX(-40%)';
          previewContainer.style.left = `${previewX}px`;
      }
    });

    // Gestione del trascinamento per la barra di progresso
    progressBar.addEventListener('touchmove', (e) => {
      if (isDragging) {
        e.preventDefault();
        const rect = progressBar.getBoundingClientRect();
        const touch = e.touches[0];
        const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        
        // Aggiorna la posizione del pallino in modo fluido
        requestAnimationFrame(() => {
          progressHandle.style.left = `${pos * 100}%`;
          video.currentTime = pos * video.duration;
          
          // Se il video era in riproduzione, continua a riprodurre
          if (wasPlaying && video.paused) {
            safePlayVideo(video);
          }
        });
      }
    });

    // Gestisci il rilascio del tocco
    progressBar.addEventListener('touchend', () => {
      isDragging = false;
      if (previewContainer) {
        previewContainer.classList.remove('visible');
      }
    });

    // Aggiungi questo codice per gestire il touch sulle impostazioni su mobile
    document.querySelectorAll('.settings-item, .quality-option, .speed-option, .subtitles-option').forEach(item => {
      item.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSettingsItemClick(e.currentTarget);
      });
    });

    // Gestione touch per il pulsante indietro
    settingsBackBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSettingsBack();
    });

    // Gestione touch per il pulsante chiudi
    settingsCloseBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelector('.menu-impostazioni').classList.remove('visible');
      isSettingsOpen = false;
    });
  }

  // Ottimizza il buffering
  video.addEventListener('canplay', () => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    loadingSpinner.classList.remove('visible');
    
    // Imposta un buffer più piccolo su mobile
    if (isMobile) {
      video.preload = 'metadata';
    }
  });

  // Event Listeners
  video.addEventListener('loadstart', () => {
    loadingSpinner.classList.add('visible');
  });

  video.addEventListener('canplay', () => {
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    loadingSpinner.classList.remove('visible');
    durationDisplay.textContent = formatTime(video.duration);
  });

  playPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlay();
  });

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMute();
  });

  volumeSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    const roundedValue = Math.round(value * 100) / 100;
    
    video.volume = roundedValue;
    volumePercentage.textContent = `${Math.round(roundedValue * 100)}%`;
    document.documentElement.style.setProperty('--volume-percentage', `${roundedValue * 100}%`);
    
    if (roundedValue === 0) {
      muteBtn.classList.add('muted');
    } else {
      muteBtn.classList.remove('muted');
      volumeBeforeMute = roundedValue;
    }
  });

  skipBackBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.currentTime = Math.max(0, video.currentTime - 10);
  });

  skipForwardBtn.addEventListener('click', (e => {
    e.stopPropagation();
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  }));

  // Funzione singola per gestire il menu impostazioni
  const toggleSettingsMenu = () => {
    console.log('Toggling settings menu'); // Debug
    if (!settingsMenu) return;

    if (!isSettingsOpen) {
      // Apertura menu
      settingsMenu.classList.add('visible');
      isSettingsOpen = true;
      // Reset allo stato iniziale
      document.querySelectorAll('.settings-content').forEach(menu => {
        menu.classList.add('hidden');
      });
      document.getElementById('mainSettings').classList.remove('hidden');
      currentMenu = 'main';
    } else {
      // Chiusura menu
      settingsMenu.classList.remove('visible');
      isSettingsOpen = false;
    }
    console.log('Menu visibility:', isSettingsOpen); // Debug
  };

  const handleSettingsItemClick = (item) => {
    if (!item.dataset.menu) return;
    
    const targetMenu = item.dataset.menu + 'Settings';
    const mainMenu = document.getElementById('mainSettings');
    const targetMenuElement = document.getElementById(targetMenu);
    
    if (mainMenu && targetMenuElement) {
      mainMenu.classList.add('hidden');
      targetMenuElement.classList.remove('hidden');
      currentMenu = targetMenu;
    }
  };

  const handleBackToMainMenu = () => {
    if (currentMenu === 'main') return;
    
    const currentMenuElement = document.getElementById(currentMenu);
    const mainMenu = document.getElementById('mainSettings');
    
    if (currentMenuElement && mainMenu) {
      currentMenuElement.classList.add('hidden');
      mainMenu.classList.remove('hidden');
      currentMenu = 'main';
    }
  };

  // Gestione eventi del menu impostazioni
  if (settingsBtn && settingsMenu) {
    // Rimuovi tutti gli event listener esistenti
    settingsBtn.replaceWith(settingsBtn.cloneNode(true));
    settingsBtn = document.getElementById('settingsBtn');

    // Gestione click/touch per il pulsante impostazioni
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSettingsMenu();
    });

    if (isMobile) {
      settingsBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
    }

    // Gestione delle opzioni del menu
    document.querySelectorAll('.settings-item').forEach(item => {
      const handleItemClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const menuType = item.dataset.menu;
        if (!menuType) return;

        const targetMenu = menuType + 'Settings';
        document.getElementById('mainSettings').classList.add('hidden');
        document.getElementById(targetMenu).classList.remove('hidden');
        currentMenu = targetMenu;
      };

      item.addEventListener('click', handleItemClick);
      if (isMobile) {
        item.addEventListener('touchend', handleItemClick, { passive: false });
      }
    });

    // Gestione pulsante indietro
    if (settingsBackBtn) {
      const handleBack = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (currentMenu !== 'main') {
          document.getElementById(currentMenu).classList.add('hidden');
          document.getElementById('mainSettings').classList.remove('hidden');
          currentMenu = 'main';
        }
      };

      settingsBackBtn.addEventListener('click', handleBack);
      if (isMobile) {
        settingsBackBtn.addEventListener('touchend', handleBack, { passive: false });
      }
    }

    // Gestione pulsante chiudi
    if (settingsCloseBtn) {
      const handleClose = (e) => {
        e.preventDefault();
        e.stopPropagation();
        settingsMenu.classList.remove('visible');
        isSettingsOpen = false;
      };

      settingsCloseBtn.addEventListener('click', handleClose);
      if (isMobile) {
        settingsCloseBtn.addEventListener('touchend', handleClose, { passive: false });
      }
    }

    // Previeni la chiusura quando si clicca/tocca il menu
    settingsMenu.addEventListener('click', (e) => e.stopPropagation());
    if (isMobile) {
      settingsMenu.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
    }

    // Chiusura quando si clicca/tocca fuori
    document.addEventListener('click', (e) => {
      if (isSettingsOpen && !settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
        settingsMenu.classList.remove('visible');
        isSettingsOpen = false;
      }
    });

    if (isMobile) {
      document.addEventListener('touchstart', (e) => {
        if (isSettingsOpen && !settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
          settingsMenu.classList.remove('visible');
          isSettingsOpen = false;
        }
      }, { passive: true });
    }
  }

  // Inizializzazione delle impostazioni predefinite
  // Nascondi tutte le check icon
  document.querySelectorAll('.quality-option .check-icon').forEach(icon => {
    icon.style.display = 'none';
  });

  // Mostra la check icon per 1080p e imposta come selezionato
  const defaultQuality = document.querySelector('.quality-option[data-quality="1080p"]');
  if (defaultQuality) {
    defaultQuality.classList.add('selected');
    defaultQuality.querySelector('.check-icon').style.display = 'block';
    // Imposta anche il testo nel menu principale
    document.getElementById('currentQuality').textContent = '1080p';
  }

  // Inizializzazione qualità per mobile
  if (isMobile) {
    // Nascondi tutte le check icon
    document.querySelectorAll('.quality-option .check-icon').forEach(icon => {
      icon.style.display = 'none';
    });
    
    // Imposta 1080p come default per mobile
    const mobileDefaultQuality = document.querySelector('.quality-option[data-quality="1080p"]');
    if (mobileDefaultQuality) {
      mobileDefaultQuality.classList.add('selected');
      mobileDefaultQuality.querySelector('.check-icon').style.display = 'block';
      document.getElementById('currentQuality').textContent = '1080p';
    }
  }

  // Funzione sicura per la riproduzione
  const safePlayVideo = async (videoElement) => {
    try {
      if (videoElement && videoElement.paused) {
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
          await playPromise.catch(error => {
            // Ignora silenziosamente l'errore AbortError
            if (error.name !== 'AbortError') {
              throw error;
            }
          });
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Errore durante la riproduzione:', error);
      }
    }
  };

  // Gestione desktop e mobile per le opzioni di qualità
  document.querySelectorAll('.quality-option').forEach(item => {
    const handleQualityChange = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Rimuovi selected da tutte le opzioni
      document.querySelectorAll('.quality-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.querySelector('.check-icon').style.display = 'none';
      });
      
      // Aggiungi selected all'opzione cliccata
      item.classList.add('selected');
      item.querySelector('.check-icon').style.display = 'block';
      
      // Ottieni la qualità selezionata
      const newQuality = item.dataset.quality;
      
      // Trova la source corrispondente alla qualità selezionata
      const sources = video.getElementsByTagName('source');
      
      for (let source of sources) {
        if (source.dataset.quality === newQuality) {
          const currentTime = video.currentTime;
          const wasPlaying = !video.paused;
          
          // Aggiorna il video principale
          video.src = source.src;
          video.load();
          video.currentTime = currentTime;
          if (wasPlaying) {
            await safePlayVideo(video);
          }
          
          // Aggiorna anche il video di preview
          if (previewVideo) {
            previewVideo.src = source.src;
            previewVideo.load();
            previewVideo.currentTime = currentTime;
            await safePlayVideo(previewVideo);
          }
          break;
        }
      }
      
      // Aggiorna il testo nel menu principale
      document.getElementById('currentQuality').textContent = newQuality;
      
      // Torna al menu principale
      document.getElementById('mainSettings').classList.remove('hidden');
      document.getElementById('qualitySettings').classList.add('hidden');
      currentMenu = 'main';
      
      // Chiudi il menu impostazioni
      document.querySelector('.menu-impostazioni').classList.remove('visible');
      isSettingsOpen = false;
    };

    // Click per desktop
    item.addEventListener('click', handleQualityChange);
    
    // Touch per mobile
    item.addEventListener('touchstart', (e) => e.preventDefault());
    item.addEventListener('touchend', handleQualityChange);
  });

  // Gestione desktop e mobile per le opzioni di velocità
  document.querySelectorAll('.speed-option').forEach(item => {
    // Desktop e Mobile
    const handleSpeedChange = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Rimuovi selected e nascondi tutte le check icon
      document.querySelectorAll('.speed-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.querySelector('.check-icon').style.display = 'none';
      });
      // Aggiungi selected e mostra la check icon dell'opzione cliccata
      item.classList.add('selected');
      item.querySelector('.check-icon').style.display = 'block';
      // Aggiorna il testo nel menu principale
      document.getElementById('currentSpeed').textContent = item.querySelector('.settings-label').textContent;
      // Cambia la velocità del video
      video.playbackRate = parseFloat(item.dataset.speed);
      // Torna al menu principale
      document.getElementById('mainSettings').classList.remove('hidden');
      document.getElementById('speedSettings').classList.add('hidden');
      currentMenu = 'main';
    };

    item.addEventListener('click', handleSpeedChange);
    item.addEventListener('touchend', handleSpeedChange);
  });

  // Gestione desktop e mobile per le opzioni dei sottotitoli
  document.querySelectorAll('.subtitles-option').forEach(item => {
    // Desktop e Mobile
    const handleSubtitlesChange = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Rimuovi selected e nascondi tutte le check icon
      document.querySelectorAll('.subtitles-option').forEach(opt => {
        opt.classList.remove('selected');
        opt.querySelector('.check-icon').style.display = 'none';
      });
      // Aggiungi selected e mostra la check icon dell'opzione cliccata
      item.classList.add('selected');
      item.querySelector('.check-icon').style.display = 'block';
      // Aggiorna il testo nel menu principale
      document.getElementById('currentSubtitles').textContent = item.querySelector('.settings-label').textContent;
      // Gestisci i sottotitoli
      const subtitle = item.dataset.subtitle;
      // Qui puoi aggiungere la logica per gestire i sottotitoli
      // Torna al menu principale
      document.getElementById('mainSettings').classList.remove('hidden');
      document.getElementById('subtitlesSettings').classList.add('hidden');
      currentMenu = 'main';
    };

    item.addEventListener('click', handleSubtitlesChange);
    item.addEventListener('touchend', handleSubtitlesChange);
  });

  // Gestione freccia indietro
  if (tornaSu) {
    tornaSu.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Aggiungi la classe per l'animazione
      document.body.classList.add('closing');
      
      // Aspetta che l'animazione finisca prima di reindirizzare
      setTimeout(() => {
        window.location.href = tornaSu.getAttribute('href');
      }, 300); // 300ms è la durata dell'animazione
    });
  }

  // Gestione del pulsante Cast
  if (castBtn) {
    castBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const notification = document.createElement('div');
      notification.className = 'cast-notification';
      notification.textContent = 'Chrome Cast non supportato su questo browser';
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '5px';
      notification.style.zIndex = '9999';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    });
  }

  // Gestione della barra di progresso
  const getProgressFromEvent = (e) => {
    const rect = progressBar.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return x / rect.width;
  };

  // Gestione doppio click
  let timeoutDoppioClick;
  const gestisciClickVideo = (e) => {
    // Verifica se il click è su un controllo o un menu
    const isControl = e.target.closest('#controls') || 
                     e.target.closest('#settingsMenu') || 
                     e.target.closest('#progressBar') ||
                     e.target.closest('#volumeContainer') ||
                     e.target.closest('button');
                     
    if (isControl) {
      e.stopPropagation();
      return;
    }
    
    if (timeoutDoppioClick) {
      clearTimeout(timeoutDoppioClick);
      timeoutDoppioClick = null;
      toggleFullscreenMode();
    } else {
      timeoutDoppioClick = setTimeout(() => {
        timeoutDoppioClick = null;
        togglePlay();
      }, 200);
    }
  };

  // Contenitore
  contenitore.addEventListener('click', gestisciClickVideo);

  // Controlli - Aggiungi stopPropagation a tutti i controlli
  const stopClickPropagation = (e) => {
    e.stopPropagation();
  };

  // Aggiungi stopPropagation a tutti i pulsanti nei controlli
  controlli.querySelectorAll('button, input').forEach(element => {
    element.addEventListener('click', stopClickPropagation);
    element.addEventListener('mousedown', stopClickPropagation);
    element.addEventListener('mouseup', stopClickPropagation);
  });

  // Gestione fullscreen
  fullscreenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFullscreenMode();
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      isBrowserFullscreen = false;
      // Se usciamo dal fullscreen del browser, torniamo alla modalità finestra
      setWindowFullscreen(true);
      isWindowFullscreen = true;
    }
  });

  // Gestione stato rete
  const checkConnection = () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      networkStatus.textContent = connection.effectiveType || 'unknown';
    }
    return navigator.onLine;
  };

  const handleNetworkChange = () => {
    const isOnline = checkConnection();
    
    if (!isOnline) {
      networkStatus.classList.add('visible');
      video.pause();
    } else {
      networkStatus.classList.remove('visible');
      // Riprendi la riproduzione solo se il video era in riproduzione
      if (wasPlaying) {
        video.play().catch(() => {});
      }
    }
  };

  // Ottimizza il buffering per mobile
  const optimizeForMobile = () => {
    if (isMobile) {
      // Imposta una qualità più bassa per mobile
      const sources = video.querySelectorAll('source');
      let lowestQualitySource = sources[sources.length - 1];
      
      // Salva lo stato corrente
      const currentTime = video.currentTime;
      const wasPlaying = !video.paused;
      
      // Cambia la sorgente solo se necessario
      if (video.src !== lowestQualitySource.src) {
        video.src = lowestQualitySource.src;
        
        // Gestisci il caricamento della nuova sorgente
        video.addEventListener('loadeddata', function onLoaded() {
          video.removeEventListener('loadeddata', onLoaded);
          video.currentTime = currentTime;
          
          if (wasPlaying) {
            // Usa requestAnimationFrame per assicurarsi che il video sia pronto
            requestAnimationFrame(() => {
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.catch(() => {});
              }
            });
          }
        }, { once: true });
      }
      
      // Imposta un buffer più piccolo
      video.preload = 'auto';
      
      // Gestione del buffering ottimizzata
      let bufferCheckInterval;
      const checkBuffer = () => {
        if (video.paused || !video.duration) return;
        
        const buffered = video.buffered;
        if (buffered.length > 0) {
          const currentBuffer = buffered.end(buffered.length - 1);
          const bufferAhead = currentBuffer - video.currentTime;
          
          if (bufferAhead < 2 && !video.paused) {
            loadingSpinner.classList.add('visible');
            video.pause();
            
            // Aspetta che ci sia abbastanza buffer
            const waitForBuffer = setInterval(() => {
              const newBuffered = video.buffered;
              if (newBuffered.length > 0) {
                const newBufferAhead = newBuffered.end(newBuffered.length - 1) - video.currentTime;
                if (newBufferAhead > 4) {
                  loadingSpinner.classList.remove('visible');
                  requestAnimationFrame(() => {
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                      playPromise.catch(() => {});
                    }
                  });
                  clearInterval(waitForBuffer);
                }
              }
            }, 1000);
          }
        }
      };

      // Pulisci l'intervallo esistente se presente
      if (bufferCheckInterval) {
        clearInterval(bufferCheckInterval);
      }
      
      // Imposta il nuovo intervallo di controllo
      bufferCheckInterval = setInterval(checkBuffer, BUFFER_CHECK_INTERVAL);
    }
  };

  // Aggiungi gli event listener per la connessione
  window.addEventListener('online', handleNetworkChange);
  window.addEventListener('offline', handleNetworkChange);
  if (navigator.connection) {
    navigator.connection.addEventListener('change', handleNetworkChange);
  }

  // Modifica l'evento loadedmetadata
  video.addEventListener('loadedmetadata', () => {
    // Precarica una parte del video
    video.preload = 'auto';
    
    // Imposta il tempo iniziale a 0
    video.currentTime = 0;
    
    // Aggiorna la durata
    durationDisplay.textContent = formatTime(video.duration);
    
    // Nascondi lo spinner di caricamento
    loadingSpinner.classList.remove('visible');
    
    // Ottimizza per mobile se necessario
    optimizeForMobile();
    
    // Inizializza la preview
    if (previewVideo) {
      previewVideo.preload = 'auto';
      previewVideo.currentTime = 0;
    }

    // Avvia automaticamente il video
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          isPlaying = true;
          playPauseBtn.classList.add('playing');
          playOverlay.classList.remove('visible');
        })
        .catch(error => {
          if (error.name === 'NotAllowedError') {
            // Se l'autoplay è bloccato, mostra il pulsante play
            playOverlay.classList.add('visible');
            isPlaying = false;
            playPauseBtn.classList.remove('playing');
          } else if (error.name !== 'AbortError') {
            console.error('Errore durante la riproduzione:', error);
          }
        });
    }
  });

  // Aggiungi anche questo per gestire il primo click dell'utente
  document.addEventListener('click', function initializeVideo() {
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          isPlaying = true;
          playPauseBtn.classList.add('playing');
          playOverlay.classList.remove('visible');
          // Rimuovi l'event listener dopo il primo click
          document.removeEventListener('click', initializeVideo);
        })
        .catch(() => {});
    }
  }, { once: true });

  // Ottimizza la gestione della preview su mobile
  let lastPreviewUpdate = 0;
  const PREVIEW_UPDATE_INTERVAL = 200; // Millisecondi tra gli aggiornamenti della preview

  const updatePreviewIfNeeded = (time, x) => {
    const now = Date.now();
    if (now - lastPreviewUpdate > PREVIEW_UPDATE_INTERVAL) {
      if (previewVideo) {
        previewVideo.currentTime = time;
        previewContainer.style.left = `${x}px`;
        updatePreviewTime(time);
      }
      lastPreviewUpdate = now;
    }
  };

  // Aggiungi questo dopo gli altri event listener
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    switch(e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlay();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreenMode();
        break;
      case 'm':
        e.preventDefault();
        toggleMute();
        break;
      case 'arrowleft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case 'arrowright':
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
        break;
      case 'arrowup':
        e.preventDefault();
        const newVolumeUp = Math.min(1, Math.round((video.volume + 0.1) * 10) / 10);
        updateVolume(newVolumeUp);
        break;
      case 'arrowdown':
        e.preventDefault();
        const newVolumeDown = Math.max(0, Math.round((video.volume - 0.1) * 10) / 10);
        updateVolume(newVolumeDown);
        break;
    }
  });

  // Modifica la gestione del volume touch
  let touchStartY = 0;
  let currentVolume = 0;
  let isAdjustingVolume = false;

  contenitore.addEventListener('touchstart', (e) => {
    // Verifica se il touch è nella metà destra dello schermo
    const touchX = e.touches[0].clientX;
    const containerWidth = contenitore.offsetWidth;
    
    if (e.touches.length === 1 && touchX > containerWidth / 2) {
      isAdjustingVolume = true;
      touchStartY = e.touches[0].clientY;
      currentVolume = video.volume;
      e.preventDefault();
    }
  }, { passive: false });

  contenitore.addEventListener('touchmove', (e) => {
    if (isAdjustingVolume && e.touches.length === 1) {
      e.preventDefault();
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      // Riduci ulteriormente la sensibilità
      const volumeChange = (deltaY / window.innerHeight) * 0.8;
      const newVolume = Math.max(0, Math.min(1, currentVolume + volumeChange));
      
      // Aggiorna il volume con più precisione
      const roundedVolume = Math.round(newVolume * 100) / 100;
      video.volume = roundedVolume;
      volumeSlider.value = roundedVolume;
      volumePercentage.textContent = `${Math.round(roundedVolume * 100)}%`;
      document.documentElement.style.setProperty('--volume-percentage', `${roundedVolume * 100}%`);
    }
  }, { passive: false });

  contenitore.addEventListener('touchend', () => {
    if (isAdjustingVolume) {
      isAdjustingVolume = false;
      currentVolume = video.volume;
    }
  });

  // Aggorna la funzione updateVolume per essere più precisa
  const updateVolume = (value) => {
    const roundedValue = Math.round(value * 100) / 100;
    video.volume = roundedValue;
    volumeSlider.value = roundedValue;
    
    // Aggiorna il testo e lo stile
    volumePercentage.textContent = `${Math.round(roundedValue * 100)}%`;
    document.documentElement.style.setProperty('--volume-percentage', `${roundedValue * 100}%`);
    
    // Aggiorna lo stato del pulsante muto
    if (roundedValue === 0) {
      muteBtn.classList.add('muted');
    } else {
      muteBtn.classList.remove('muted');
      volumeBeforeMute = roundedValue;
    }
  };

  // Modifica la gestione del mousemove
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const rect = progressBar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      
      // Aggiorna il tempo del video
      video.currentTime = pos * video.duration;
      
      // Aggiorna la UI
      progressFill.style.transform = `scaleX(${pos})`;
      progressHandle.style.left = `${pos * 100}%`;
      currentTimeDisplay.textContent = formatTime(video.currentTime);
      
      // Mantieni la preview visibile e aggiornata durante il trascinamento
      if (previewContainer && previewVideo) {
        previewContainer.classList.add('visible');
        previewVideo.currentTime = pos * video.duration;
        updatePreviewTime(pos * video.duration);
        const previewX = e.clientX - rect.left;
        previewContainer.style.transform = 'translateX(-40%)';
        previewContainer.style.left = `${previewX}px`;
      }
    }
  });

  // Modifica l'evento mouseup
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      if (wasPlaying) {
        video.play();
      }
      // Rimuovi la preview solo se il mouse non è sulla barra di progresso
      if (!progressBar.matches(':hover')) {
        if (previewContainer) {
          previewContainer.classList.remove('visible');
        }
      }
    }
  });

  // Modifica anche lo stile CSS per la preview
  const style = document.createElement('style');
  style.textContent = `
    .contenitore-anteprima {
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 1000 !important;
    }

    .contenitore-anteprima.visible {
      opacity: 1 !important;
    }

    .progress-container:hover .contenitore-anteprima {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  // Aggiungi gestione errori video
  video.addEventListener('error', (e) => {
    console.error('Errore video:', e);
    loadingSpinner.classList.add('visible');
    
    // Riprova a caricare il video dopo un errore
    setTimeout(() => {
      const currentTime = video.currentTime;
      video.load();
      video.currentTime = currentTime;
      if (wasPlaying) {
        video.play().catch(() => {});
      }
    }, 2000);
  });

  // Aggiungi stili per migliorare l'interazione con il pulsante di chiusura
  const touchStyle = document.createElement('style');
  touchStyle.textContent += `
    @media (max-width: 768px) {
      .settings-close-btn {
        padding: 15px;
        touch-action: manipulation;
        cursor: pointer;
        z-index: 1001;
      }

      .settings-close-btn svg {
        width: 24px;
        height: 24px;
      }
    }
  `;
  document.head.appendChild(touchStyle);

  // Modifica la gestione della preview per desktop
  progressBar.addEventListener('mouseenter', (e) => {
    isHovering = true;
    if (previewContainer && previewVideo && video.duration && isFinite(video.duration)) {
      const rect = progressBar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      
      previewContainer.style.display = 'block';
      previewContainer.classList.add('visible');
      
      const previewTime = pos * video.duration;
      if (isFinite(previewTime) && previewTime >= 0) {
        try {
          previewVideo.currentTime = previewTime;
          updatePreviewTime(previewTime);
        } catch (error) {
          console.warn('Non è possibile impostare il tempo di preview:', error);
        }
      }
      
      const previewX = e.clientX - rect.left;
      previewContainer.style.transform = 'translateX(-40%)';
      previewContainer.style.left = `${previewX}px`;
    }
  });

  progressBar.addEventListener('mousemove', (e) => {
    if ((isHovering || isDragging) && video.duration && isFinite(video.duration)) {
      const rect = progressBar.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      
      if (previewContainer && previewVideo) {
        previewContainer.style.display = 'block';
        previewContainer.classList.add('visible');
        
        const previewTime = pos * video.duration;
        if (isFinite(previewTime) && previewTime >= 0) {
          try {
            previewVideo.currentTime = previewTime;
            updatePreviewTime(previewTime);
          } catch (error) {
            console.warn('Non è possibile impostare il tempo di preview:', error);
          }
        }
        
        const previewX = e.clientX - rect.left;
        previewContainer.style.transform = 'translateX(-40%)';
        previewContainer.style.left = `${previewX}px`;
      }
    }
  });

  progressBar.addEventListener('mouseleave', () => {
    isHovering = false;
    if (previewContainer && !isDragging) {
      previewContainer.classList.remove('visible');
      previewContainer.style.display = 'none';
      if (previewVideo) {
        // Manteniamo solo il reset del tempo
        previewVideo.currentTime = 0;
      }
    }
  });

  // Inizializzazione
  setWindowFullscreen(true);
  handleNetworkChange();

  // Aggiungi event listener per il movimento del mouse
  contenitore.addEventListener('mousemove', showControls);
  
  // Mantieni il cursore visibile quando il mouse è sopra i controlli o la barra di progresso
  controlli.addEventListener('mouseenter', () => {
    contenitore.style.cursor = 'default';
    clearTimeout(hideControlsTimeout);
  });

  // Event listeners per le opzioni del menu
  document.querySelectorAll('.settings-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleSettingsItemClick(item);
    });
  });

  // Gestione pulsante indietro
  if (settingsBackBtn) {
    settingsBackBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (currentMenu !== 'main') {
        document.getElementById(currentMenu).classList.add('hidden');
        document.getElementById('mainSettings').classList.remove('hidden');
        currentMenu = 'main';
      }
    });
  }

  // Gestione pulsante chiudi
  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      document.querySelector('.menu-impostazioni').classList.remove('visible');
      isSettingsOpen = false;
    });
  }

  // Gestione freccia indietro
  if (tornaSu) {
    tornaSu.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = tornaSu.getAttribute('href');
    });
  }

  // Gestione del pulsante Cast
  if (castBtn) {
    castBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const notification = document.createElement('div');
      notification.className = 'cast-notification';
      notification.textContent = 'Chrome Cast non supportato su questo browser';
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      notification.style.color = 'white';
      notification.style.padding = '10px 20px';
      notification.style.borderRadius = '5px';
      notification.style.zIndex = '9999';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    });
  }

  // Alla fine, inizializza il menu impostazioni
  if (window.isMobile) {
    initMobileSettingsMenu();
  } else {
    initDesktopSettingsMenu();
  }
});