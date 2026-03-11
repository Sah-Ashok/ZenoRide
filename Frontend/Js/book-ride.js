/* ── book-ride.js ─────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  if (!Auth.requireAuth()) return;

  const token = Auth.getToken();
  const role = Auth.getRole() || "rider";
  const name = Auth.getName() || "User";

  // ── Nav avatar ─────────────────────────────────
  const navAvatar = document.getElementById("navAvatar");
  if (navAvatar) navAvatar.textContent = name.charAt(0).toUpperCase();

  // ── Logout ─────────────────────────────────────
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    SocketManager.disconnect();
    Auth.logout();
  });

  // ════════════════════════════════════════════════
  //  MAP  (shared – must init before views)
  // ════════════════════════════════════════════════
  const map = L.map("map", {
    center: [28.6139, 77.209], // Default: New Delhi
    zoom: 13,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution:
      '© <a href="https://openstreetmap.org">OpenStreetMap</a> © CARTO',
    maxZoom: 19,
  }).addTo(map);

  // Force Leaflet to recalculate container size after layout is stable
  setTimeout(() => map.invalidateSize(), 100);

  // Try to centre on user's location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => map.setView([coords.latitude, coords.longitude], 15),
      () => {},
    );
  }

  // Custom marker factory
  function makeIcon(color, shadow) {
    return L.divIcon({
      className: "",
      html: `<div style="
        width:16px;height:16px;
        background:${color};
        border-radius:50%;
        border:3px solid white;
        box-shadow:0 0 12px ${shadow}
      "></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
  }
  const pickupIcon = makeIcon("#7c6ef6", "#7c6ef6e6");
  const dropoffIcon = makeIcon("#ff6b7a", "#ff6b7acc");
  const driverIcon = makeIcon("#ffc145", "#ffc145cc");

  // ── Show correct view per role ──────────────────
  const riderView = document.getElementById("riderView");
  const driverView = document.getElementById("driverView");
  if (role === "driver") {
    if (riderView) riderView.style.display = "none";
    if (driverView) driverView.style.display = "flex";
    initDriverView();
  } else {
    if (riderView) riderView.style.display = "flex";
    if (driverView) driverView.style.display = "none";
    initRiderView();
  }

  // ════════════════════════════════════════════════
  //  RIDER VIEW
  // ════════════════════════════════════════════════
  function initRiderView() {
    let pickup = null,
      dropoff = null;
    let pMarker = null,
      dMarker = null;
    let routeLine = null;
    let liveWatchId = null;
    let isLiveLocation = false;

    const requestBtn = document.getElementById("requestBtn");
    const pickupInput = document.getElementById("pickupInput");
    const dropoffInput = document.getElementById("dropoffInput");
    const pickupCoordEl = document.getElementById("pickupCoord");
    const dropoffCoordEl = document.getElementById("dropoffCoord");
    const pickupCard = document.getElementById("pickupCard");
    const dropoffCard = document.getElementById("dropoffCard");
    const pickupSuggestions = document.getElementById("pickupSuggestions");
    const dropoffSuggestions = document.getElementById("dropoffSuggestions");
    const useMyLocationBtn = document.getElementById("useMyLocationBtn");
    const liveBadge = document.getElementById("liveBadge");
    const mapHint = document.getElementById("mapHint");
    const statusBadge = document.getElementById("rideStatusBadge");
    const clearBtn = document.getElementById("clearBtn");
    const driverBanner = document.getElementById("driverBanner");
    const driverBannerInfo = document.getElementById("driverBannerInfo");
    const nearbyCountEl = document.getElementById("nearbyCount");

    // Track nearby driver markers
    const nearbyDriverMarkers = new Map();

    // ── Nominatim geocoding helper ──────────────────
    let searchDebounce = null;
    function searchAddress(query, targetEl) {
      clearTimeout(searchDebounce);
      if (query.length < 3) {
        targetEl.innerHTML = "";
        return;
      }
      searchDebounce = setTimeout(async () => {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
          const resp = await fetch(url);
          const data = await resp.json();
          targetEl.innerHTML = "";
          data.forEach((item) => {
            const div = document.createElement("div");
            div.className = "loc-suggestion-item";
            div.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${item.display_name}`;
            div.addEventListener("click", () => {
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (targetEl === pickupSuggestions) {
                setPickup(lat, lng);
                pickupInput.value = item.display_name
                  .split(",")
                  .slice(0, 2)
                  .join(",");
              } else {
                setDropoff(lat, lng);
                dropoffInput.value = item.display_name
                  .split(",")
                  .slice(0, 2)
                  .join(",");
              }
              targetEl.innerHTML = "";
            });
            targetEl.appendChild(div);
          });
        } catch (e) {
          /* ignore geocoding errors */
        }
      }, 400);
    }

    pickupInput?.addEventListener("input", () => {
      // If user types, disable live location
      if (isLiveLocation) stopLiveLocation();
      searchAddress(pickupInput.value, pickupSuggestions);
    });
    dropoffInput?.addEventListener("input", () => {
      searchAddress(dropoffInput.value, dropoffSuggestions);
    });

    // ── Reverse geocode helper ──────────────────────
    async function reverseGeocode(lat, lng) {
      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        );
        const data = await resp.json();
        return data.display_name
          ? data.display_name.split(",").slice(0, 3).join(",").trim()
          : null;
      } catch (e) {
        return null;
      }
    }

    // ── Set pickup / dropoff helpers ────────────────
    function setPickup(lat, lng) {
      pickup = { lat, lng };
      if (pMarker) pMarker.remove();
      pMarker = L.marker([lat, lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup('<b style="color:#080b16">📍 Pickup</b>');

      pickupCoordEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      pickupCoordEl.classList.add("active");
      pickupCard.classList.add("set");
      map.setView([lat, lng], 15);

      drawRouteIfReady();
      fetchNearbyDrivers(lat, lng);
    }

    function setDropoff(lat, lng) {
      dropoff = { lat, lng };
      if (dMarker) dMarker.remove();
      dMarker = L.marker([lat, lng], { icon: dropoffIcon })
        .addTo(map)
        .bindPopup('<b style="color:#080b16">🏁 Drop-off</b>');

      dropoffCoordEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      dropoffCoordEl.classList.add("active");
      dropoffCard.classList.add("set");

      drawRouteIfReady();
    }

    function drawRouteIfReady() {
      if (!pickup || !dropoff) {
        if (mapHint)
          mapHint.textContent = pickup
            ? "📍 Set your destination"
            : "📍 Set your pickup location";
        requestBtn.disabled = true;
        return;
      }
      if (routeLine) map.removeLayer(routeLine);
      routeLine = L.polyline(
        [
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ],
        { color: "#7c6ef6", weight: 2, dashArray: "8 6", opacity: 0.7 },
      ).addTo(map);
      map.fitBounds(
        [
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ],
        { padding: [50, 50] },
      );
      if (mapHint)
        mapHint.textContent = "✅ Both points set — request your ride below";
      requestBtn.disabled = false;
    }

    // ── Use my location (live GPS) ──────────────────
    useMyLocationBtn?.addEventListener("click", () => {
      if (isLiveLocation) {
        stopLiveLocation();
        return;
      }
      if (!navigator.geolocation) {
        Toast.error(
          "Unavailable",
          "Geolocation is not supported by your browser.",
        );
        return;
      }
      isLiveLocation = true;
      useMyLocationBtn.classList.add("active");
      liveBadge.style.display = "flex";
      pickupInput.value = "Getting your location…";
      pickupInput.disabled = true;

      liveWatchId = navigator.geolocation.watchPosition(
        async ({ coords }) => {
          const lat = coords.latitude;
          const lng = coords.longitude;
          setPickup(lat, lng);
          const name = await reverseGeocode(lat, lng);
          if (name && isLiveLocation) pickupInput.value = name;
        },
        () => {
          Toast.error("Location error", "Could not get your position.");
          stopLiveLocation();
        },
        { enableHighAccuracy: true },
      );
    });

    function stopLiveLocation() {
      isLiveLocation = false;
      if (liveWatchId !== null) {
        navigator.geolocation.clearWatch(liveWatchId);
        liveWatchId = null;
      }
      useMyLocationBtn?.classList.remove("active");
      if (liveBadge) liveBadge.style.display = "none";
      pickupInput.disabled = false;
    }

    // ── Map clicks (fallback) ───────────────────────
    map.on("click", async ({ latlng }) => {
      const { lat, lng } = latlng;

      if (!pickup) {
        if (isLiveLocation) stopLiveLocation();
        setPickup(lat, lng);
        const name = await reverseGeocode(lat, lng);
        if (name) pickupInput.value = name;
        Toast.info("Pickup set!", "Now set your destination.");
      } else if (!dropoff) {
        setDropoff(lat, lng);
        const name = await reverseGeocode(lat, lng);
        if (name) dropoffInput.value = name;
        Toast.success("Destination set!", "Ready to request your ride.");
      } else {
        clearPoints();
        Toast.info("Cleared", "Set a new pickup location.");
      }
    });

    // ── Nearby drivers ──────────────────────────────
    async function fetchNearbyDrivers(lat, lng) {
      try {
        const data = await api.get(
          `/driver/nearby?lat=${lat}&lng=${lng}&radius=5`,
          token,
        );
        updateNearbyDriversOnMap(data.drivers || []);
      } catch (e) {
        /* ignore */
      }
    }

    function updateNearbyDriversOnMap(drivers) {
      // Remove old markers not in new list
      const newIds = new Set(drivers.map((d) => String(d.driverId)));
      nearbyDriverMarkers.forEach((marker, id) => {
        if (!newIds.has(id)) {
          marker.remove();
          nearbyDriverMarkers.delete(id);
        }
      });
      // Add/update markers
      drivers.forEach(({ driverId, lat, lng }) => {
        const id = String(driverId);
        if (nearbyDriverMarkers.has(id)) {
          nearbyDriverMarkers.get(id).setLatLng([lat, lng]);
        } else {
          const carIcon = L.divIcon({
            className: "driver-car-icon",
            html: "🚗",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          const m = L.marker([lat, lng], { icon: carIcon }).addTo(map);
          nearbyDriverMarkers.set(id, m);
        }
      });
      if (nearbyCountEl) nearbyCountEl.textContent = nearbyDriverMarkers.size;
    }

    // ── Clear ───────────────────────────────────────
    clearBtn?.addEventListener("click", () => {
      clearPoints();
      Toast.info("Cleared", "Set a new pickup location.");
    });

    function clearPoints() {
      pickup = null;
      dropoff = null;
      if (pMarker) {
        pMarker.remove();
        pMarker = null;
      }
      if (dMarker) {
        dMarker.remove();
        dMarker = null;
      }
      if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
      }
      if (isLiveLocation) stopLiveLocation();
      pickupInput.value = "";
      dropoffInput.value = "";
      pickupCoordEl.textContent = "";
      dropoffCoordEl.textContent = "";
      pickupCoordEl.classList.remove("active");
      dropoffCoordEl.classList.remove("active");
      pickupCard.classList.remove("set");
      dropoffCard.classList.remove("set");
      pickupSuggestions.innerHTML = "";
      dropoffSuggestions.innerHTML = "";
      if (mapHint) mapHint.textContent = "📍 Set your pickup location";
      requestBtn.disabled = true;
      statusBadge.className = "status-badge status-idle";
      statusBadge.innerHTML = '<span class="status-dot"></span> Idle';
      if (driverBanner) driverBanner.classList.remove("show");
    }

    // ── Socket ──────────────────────────────────────
    const socket = SocketManager.connect();
    if (socket) {
      // Live-update nearby driver positions
      socket.on("driver:locationUpdate", ({ driverId, lat, lng }) => {
        const id = String(driverId);
        if (nearbyDriverMarkers.has(id)) {
          nearbyDriverMarkers.get(id).setLatLng([lat, lng]);
        } else {
          const carIcon = L.divIcon({
            className: "driver-car-icon",
            html: "🚗",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          const m = L.marker([lat, lng], { icon: carIcon }).addTo(map);
          nearbyDriverMarkers.set(id, m);
        }
        if (nearbyCountEl) nearbyCountEl.textContent = nearbyDriverMarkers.size;
      });

      socket.on("ride:accepted", (ride) => {
        Loader.hide();
        statusBadge.className = "status-badge status-accepted";
        statusBadge.innerHTML =
          '<span class="status-dot"></span> Driver En Route 🚗';

        if (driverBanner) {
          driverBanner.classList.add("show");
          if (driverBannerInfo) {
            driverBannerInfo.innerHTML = `
              Ride <strong>#${ride.id}</strong> accepted!
              Your driver is on the way. Status: <strong>${ride.status}</strong>
            `;
          }
        }

        Toast.success(
          "Driver accepted your ride!",
          `Ride #${ride.id} — driver is en route.`,
        );
        requestBtn.disabled = false;
        requestBtn.innerHTML =
          '<i class="fa-solid fa-location-dot"></i> Request Another Ride';
      });

      socket.on("ride:error", ({ message }) => {
        Loader.hide();
        Toast.error("Ride error", message);
        requestBtn.disabled = false;
        requestBtn.innerHTML =
          '<i class="fa-solid fa-location-dot"></i> Request Ride';
      });
    }

    // ── Request Ride button ────────────────────────
    requestBtn.addEventListener("click", async () => {
      if (!pickup || !dropoff) {
        Toast.error("Incomplete", "Please set both pickup and destination.");
        return;
      }

      requestBtn.disabled = true;
      requestBtn.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Requesting…';

      try {
        const data = await api.post(
          "/rides/request",
          {
            pickup_lat: pickup.lat,
            pickup_lng: pickup.lng,
            drop_lat: dropoff.lat,
            drop_lng: dropoff.lng,
          },
          token,
        );

        statusBadge.className = "status-badge status-waiting";
        statusBadge.innerHTML =
          '<span class="status-dot pulse"></span> Searching for drivers…';
        if (driverBanner) driverBanner.classList.remove("show");

        Loader.show(
          "Finding your driver…",
          "Nearby drivers are being notified. Please wait.",
        );

        Toast.info(
          "Ride requested!",
          `Ride #${data.ride.id} — waiting for a driver.`,
        );

        // Track the ride ID so we can cancel it
        requestBtn.dataset.rideId = data.ride.id;
      } catch (err) {
        Toast.error("Request failed", err.message);
        requestBtn.disabled = false;
        requestBtn.innerHTML =
          '<i class="fa-solid fa-location-dot"></i> Request Ride';
      }
    });

    // ── Cancel loader ──────────────────────────────
    document
      .getElementById("loaderCancel")
      ?.addEventListener("click", async () => {
        const rideId = requestBtn.dataset.rideId;
        Loader.hide();
        statusBadge.className = "status-badge status-idle";
        statusBadge.innerHTML = '<span class="status-dot"></span> Cancelled';
        requestBtn.disabled = false;
        requestBtn.innerHTML =
          '<i class="fa-solid fa-location-dot"></i> Request Ride';

        // Notify backend so drivers see the cancellation
        if (rideId) {
          try {
            await api.post(`/rides/rides/${rideId}/cancel`, {}, token);
          } catch (e) {
            /* ride may already be accepted */
          }
          delete requestBtn.dataset.rideId;
        }

        Toast.info("Cancelled", "You cancelled the ride request.");
      });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => stopLiveLocation());
  }

  // ════════════════════════════════════════════════
  //  DRIVER VIEW
  // ════════════════════════════════════════════════
  function initDriverView() {
    const rideList = document.getElementById("rideRequestsList");
    const statusText = document.getElementById("driverStatus");
    const goOnlineBtn = document.getElementById("goOnlineBtn");
    let driverMarker = null;
    let isOnline = false;
    let socket = null;

    function connectSocket() {
      socket = SocketManager.connect();
      console.log(
        "[Driver] connectSocket called, socket:",
        socket?.id,
        "connected:",
        socket?.connected,
      );
      if (!socket) return;

      socket.on("connect", () => {
        console.log("[Driver] socket connected, id:", socket.id);
      });

      socket.onAny((event, ...args) => {
        console.log("[Driver] received event:", event, args);
      });

      socket.on("ride:requested", (ride) => {
        console.log("[Driver] ride:requested received:", ride);
        if (!isOnline) return;
        appendRideCard(ride);
        Toast.info("New ride request!", `Ride #${ride.id} near you.`);
      });

      socket.on("ride:accepted", (ride) => {
        document.getElementById(`rrc-${ride.id}`)?.remove();
        Toast.success(
          "Ride accepted!",
          `You are now driving ride #${ride.id}.`,
        );
      });

      socket.on("ride:cancelled", ({ rideId }) => {
        const card = document.getElementById(`rrc-${rideId}`);
        if (card) {
          card.remove();
          Toast.info(
            "Ride cancelled",
            `Ride #${rideId} was cancelled by the rider.`,
          );
        }
      });
    }

    function disconnectSocket() {
      SocketManager.disconnect();
      socket = null;
    }

    // ── Go Online / Offline toggle ─────────────────
    goOnlineBtn?.addEventListener("click", () => {
      isOnline = !isOnline;
      if (goOnlineBtn) {
        goOnlineBtn.innerHTML = isOnline
          ? '<i class="fa-solid fa-circle-dot"></i> Go Offline'
          : '<i class="fa-solid fa-circle-dot"></i> Go Online';
        goOnlineBtn.className = isOnline
          ? "btn btn-danger w-full"
          : "btn btn-accent w-full";
      }
      if (statusText) {
        statusText.className = `status-badge ${isOnline ? "status-accepted" : "status-idle"}`;
        statusText.innerHTML = isOnline
          ? '<span class="status-dot pulse"></span> Online — accepting rides'
          : '<span class="status-dot"></span> Offline';
      }

      if (isOnline) {
        connectSocket();
        Toast.success(
          "You are online!",
          "Nearby ride requests will appear here.",
        );
        startLocationTracking();
      } else {
        stopLocationTracking();
        disconnectSocket();
        Toast.info(
          "You went offline.",
          "You will no longer receive ride requests.",
        );
      }
    });

    function appendRideCard(ride) {
      if (document.getElementById(`rrc-${ride.id}`)) return; // already shown
      const pLat = parseFloat(ride.pickup_lat);
      const pLng = parseFloat(ride.pickup_lng);
      const dLat = parseFloat(ride.drop_lat);
      const dLng = parseFloat(ride.drop_lng);
      const card = document.createElement("div");
      card.className = "ride-request-card";
      card.id = `rrc-${ride.id}`;
      card.innerHTML = `
        <div class="rrc-header">
          <span class="rrc-id"><i class="fa-solid fa-bolt"></i> Ride #${ride.id}</span>
          <span class="status-badge status-waiting" style="font-size:11px;padding:3px 10px">
            <span class="status-dot pulse"></span> Waiting
          </span>
        </div>
        <div class="rrc-body">
          <div><i class="fa-solid fa-circle" style="color:#7c6ef6;font-size:8px"></i>
            Pickup: <strong>${pLat.toFixed(5)}, ${pLng.toFixed(5)}</strong>
          </div>
          <div style="margin-top:6px"><i class="fa-solid fa-circle" style="color:#ff6b7a;font-size:8px"></i>
            Drop-off: <strong>${dLat.toFixed(5)}, ${dLng.toFixed(5)}</strong>
          </div>
        </div>
        <button class="btn btn-success btn-sm w-full accept-btn" data-id="${ride.id}">
          <i class="fa-solid fa-check"></i> Accept Ride
        </button>
      `;

      // Show pickup + dropoff on map with route line
      if (pLat && pLng) {
        L.marker([pLat, pLng], { icon: pickupIcon })
          .addTo(map)
          .bindPopup(`<b style="color:#080b16">Ride #${ride.id} Pickup</b>`);
      }
      if (dLat && dLng) {
        L.marker([dLat, dLng], { icon: dropoffIcon })
          .addTo(map)
          .bindPopup(`<b style="color:#080b16">Ride #${ride.id} Drop-off</b>`);
      }
      if (pLat && pLng && dLat && dLng) {
        L.polyline(
          [
            [pLat, pLng],
            [dLat, dLng],
          ],
          { color: "#7c6ef6", weight: 2, dashArray: "8 6", opacity: 0.7 },
        ).addTo(map);
        map.fitBounds(
          [
            [pLat, pLng],
            [dLat, dLng],
          ],
          { padding: [50, 50] },
        );
      } else if (pLat && pLng) {
        map.flyTo([pLat, pLng], 14);
      }

      rideList?.prepend(card);

      // Accept button
      card.querySelector(".accept-btn").addEventListener("click", () => {
        acceptRide(ride.id, card);
      });
    }

    async function acceptRide(rideId, cardEl) {
      const btn = cardEl.querySelector(".accept-btn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Accepting…';
      }

      try {
        const data = await api.post(`/rides/rides/${rideId}/accept`, {}, token);
        cardEl.remove();
        Toast.success(
          "Ride accepted!",
          `Ride #${data.ride.id} — head to the pickup.`,
        );
      } catch (err) {
        Toast.error("Could not accept", err.message);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Accept Ride';
        }
      }
    }

    // ── GPS location tracking ──────────────────────
    let watchId = null;
    function startLocationTracking() {
      if (!navigator.geolocation) return;

      // Send an immediate position so driver appears in Redis right away
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const { latitude: lat, longitude: lng } = coords;
          map.setView([lat, lng], 14);
          if (driverMarker) driverMarker.setLatLng([lat, lng]);
          else
            driverMarker = L.marker([lat, lng], { icon: driverIcon })
              .addTo(map)
              .bindPopup('<b style="color:#080b16">📍 You</b>');
          if (socket) socket.emit("driver:location", { lat, lng });
        },
        () => {},
        { enableHighAccuracy: true },
      );

      watchId = navigator.geolocation.watchPosition(
        ({ coords }) => {
          const { latitude: lat, longitude: lng } = coords;
          map.setView([lat, lng]);

          if (driverMarker) driverMarker.setLatLng([lat, lng]);
          else
            driverMarker = L.marker([lat, lng], { icon: driverIcon })
              .addTo(map)
              .bindPopup('<b style="color:#080b16">📍 You</b>');

          if (socket) socket.emit("driver:location", { lat, lng });
        },
        () => {},
        { enableHighAccuracy: true },
      );
    }
    function stopLocationTracking() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    }

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      stopLocationTracking();
      disconnectSocket();
    });
  }
});
