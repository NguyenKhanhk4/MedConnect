/**
 * Jitsi Meet Service
 * Handles video call functionality using Jitsi Meet
 */

class JitsiService {
  constructor() {
    this.api = null;
    this.domain = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si';
    this.currentContainerId = null;
    this.isInitializing = false;
    this.options = {
      roomName: null,
      width: '100%',
      height: '100%',
      parentNode: null,
      configOverwrite: {
        startAudioMuted: false,
        startVideoMuted: false,
      },
      interfaceConfigOverwrite: {
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      },
      userInfo: {
        displayName: '',
        email: ''
      },
      onload: this.onJitsiLoad.bind(this),
    };
  }

  // Initialize Jitsi Meet
  initialize(containerId, roomName, userInfo = {}) {
    console.log('🎥 JitsiService.initialize called with:', {
      containerId,
      roomName,
      userInfo,
      isInitialized: !!this.api,
      isInitializing: this.isInitializing,
      currentContainerId: this.currentContainerId
    });
    
    // Prevent duplicate initialization
    if (this.api && this.currentContainerId === containerId) {
      console.log('⚠️ Jitsi already initialized for this container, skipping...');
      return Promise.resolve(this.api);
    }

    // If initializing or already initialized for different container, dispose old instance
    if (this.api) {
      console.log('🔄 Disposing old Jitsi instance...');
      this.endCall();
    }

    this.isInitializing = true;
    this.currentContainerId = containerId;
    
    return new Promise((resolve, reject) => {
      try {
        // Wait for container to be available
        const checkContainer = () => {
          const container = document.getElementById(containerId);
          console.log('🎥 Container found:', containerId, container);
          if (!container) {
            console.warn(`Container ${containerId} not found, retrying...`);
            setTimeout(checkContainer, 100);
            return;
          }

          // Load Jitsi Meet external API
          if (!window.JitsiMeetExternalAPI) {
            const script = document.createElement('script');
            script.src = `https://${this.domain}/external_api.js`;
            script.async = true;
            script.onload = () => {
              console.log('🎥 Creating Jitsi API for room:', roomName);
              this.api = new window.JitsiMeetExternalAPI(this.domain, {
                ...this.options,
                roomName: roomName,
                parentNode: container,
                configOverwrite: this.options.configOverwrite,
                interfaceConfigOverwrite: this.options.interfaceConfigOverwrite,
                userInfo: {
                  displayName: userInfo.displayName || '',
                  email: userInfo.email || ''
                }
              });
              console.log('✅ Jitsi API created, room:', roomName);
              this.isInitializing = false;
              this.setupEventListeners();
              resolve(this.api);
            };
            script.onerror = () => {
              this.isInitializing = false;
              reject(new Error('Failed to load Jitsi Meet API'));
            };
            document.body.appendChild(script);
          } else {
            console.log('🎥 Creating Jitsi API (external API already loaded) for room:', roomName);
            this.api = new window.JitsiMeetExternalAPI(this.domain, {
              ...this.options,
              roomName: roomName,
              parentNode: container,
              configOverwrite: this.options.configOverwrite,
              interfaceConfigOverwrite: this.options.interfaceConfigOverwrite,
              userInfo: {
                displayName: userInfo.displayName || '',
                email: userInfo.email || ''
              }
            });
            console.log('✅ Jitsi API created, room:', roomName);
            this.isInitializing = false;
            this.setupEventListeners();
            resolve(this.api);
          }
        };

        checkContainer();
      } catch (error) {
        console.error('Failed to initialize Jitsi Meet:', error);
        this.isInitializing = false;
        reject(error);
      }
    });
  }

  // Setup event listeners
  setupEventListeners() {
    if (!this.api) return;

    this.api.addEventListener('videoConferenceJoined', () => {
      console.log('Joined video conference');
      this.onConferenceJoined?.();
    });

    this.api.addEventListener('participantJoined', (event) => {
      console.log('Participant joined:', event);
      this.onParticipantJoined?.(event);
    });

    this.api.addEventListener('participantLeft', (event) => {
      console.log('Participant left:', event);
      this.onParticipantLeft?.(event);
    });

    this.api.addEventListener('audioMuteStatusChanged', (event) => {
      console.log('Audio mute status changed:', event);
      this.onAudioMuteStatusChanged?.(event.muted);
    });

    this.api.addEventListener('videoMuteStatusChanged', (event) => {
      console.log('Video mute status changed:', event);
      this.onVideoMuteStatusChanged?.(event.muted);
    });

    this.api.addEventListener('readyToClose', () => {
      console.log('Ready to close');
      this.onReadyToClose?.();
    });

    // Listen for conference left event - khi bấm hangup
    this.api.addEventListener('videoConferenceLeft', () => {
      console.log('Conference left');
      this.onReadyToClose?.();
    });

    this.api.addEventListener('errorOccurred', (error) => {
      console.error('Jitsi error:', error);
      this.onError?.(error);
    });
  }

  // On Jitsi load
  onJitsiLoad() {
    console.log('Jitsi Meet loaded');
  }

  // Toggle audio
  toggleAudio() {
    if (this.api) {
      this.api.executeCommand('toggleAudio');
    }
  }

  // Toggle video
  toggleVideo() {
    if (this.api) {
      this.api.executeCommand('toggleVideo');
    }
  }

  // End call
  endCall() {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }
    this.currentContainerId = null;
    this.isInitializing = false;
  }

  // Set callbacks
  setCallbacks(callbacks) {
    this.onConferenceJoined = callbacks.onConferenceJoined;
    this.onParticipantJoined = callbacks.onParticipantJoined;
    this.onParticipantLeft = callbacks.onParticipantLeft;
    this.onAudioMuteStatusChanged = callbacks.onAudioMuteStatusChanged;
    this.onVideoMuteStatusChanged = callbacks.onVideoMuteStatusChanged;
    this.onReadyToClose = callbacks.onReadyToClose;
    this.onError = callbacks.onError;
  }

  // Check if API is initialized
  isInitialized() {
    return this.api !== null;
  }
}

// Create singleton instance
const jitsiService = new JitsiService();

export default jitsiService;

