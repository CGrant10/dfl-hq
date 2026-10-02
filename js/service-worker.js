// Push setup must never hold the first route open waiting for its own worker.
let registrationRequest;

export function registerAppWorker() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return Promise.resolve(null);
  registrationRequest ||= navigator.serviceWorker.register("sw.js", { updateViaCache: "none" })
    .catch(error => { registrationRequest = null; console.warn("Service worker unavailable", error); return null; });
  return registrationRequest;
}

export async function activeAppWorker({ wait = false, timeoutMs = 6000 } = {}) {
  if (!("serviceWorker" in navigator)) return null;
  let timer;
  const lookup = async () => {
    if (wait) await registerAppWorker();
    const registered = await navigator.serviceWorker.getRegistration();
    if (registered?.active) return registered;
    return wait ? navigator.serviceWorker.ready : null;
  };
  try {
    return await Promise.race([
      lookup(),
      new Promise(resolve => { timer = setTimeout(() => resolve(null), timeoutMs); }),
    ]);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function requireAppWorker() {
  const worker = await activeAppWorker({ wait: true });
  if (!worker) throw new Error("Notifications could not connect on this device. Check your connection and try again.");
  return worker;
}
