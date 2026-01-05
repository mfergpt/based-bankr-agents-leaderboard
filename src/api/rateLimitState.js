// Rate limit state manager for UI notifications
// Allows API services to notify the UI when rate limiting occurs

const listeners = new Set();

let currentState = {
  isWaiting: false,
  source: null,
  secondsRemaining: 0,
  message: null
};

let countdownInterval = null;

export function getRateLimitState() {
  return { ...currentState };
}

export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notify() {
  listeners.forEach(cb => cb({ ...currentState }));
}

export function startRateLimitWait(source, seconds, message = null) {
  currentState = {
    isWaiting: true,
    source,
    secondsRemaining: seconds,
    message: message || `${source} rate limited, waiting ${seconds}s...`
  };
  notify();

  // Clear any existing countdown
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Start countdown
  countdownInterval = setInterval(() => {
    currentState.secondsRemaining--;
    currentState.message = `${source} rate limited, waiting ${currentState.secondsRemaining}s...`;
    notify();

    if (currentState.secondsRemaining <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      currentState = {
        isWaiting: false,
        source: null,
        secondsRemaining: 0,
        message: null
      };
      notify();
    }
  }, 1000);
}

export function clearRateLimitWait() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  currentState = {
    isWaiting: false,
    source: null,
    secondsRemaining: 0,
    message: null
  };
  notify();
}
