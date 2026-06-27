// LoopFlow backend integration glue.
//
// Bridges the API client (window.LoopFlowAPI) to the app (AppState + render
// functions defined in main.js). Loaded BEFORE main.js so `window.LF` exists;
// its methods run after main.js has defined AppState/createBeatCard/etc.
//
// Design: every server path degrades gracefully. If the API base URL is not
// configured (offline mode) or a request fails, the app keeps working against
// localStorage + the built-in sample feed exactly as before.
(function () {
  "use strict";

  var api = window.LoopFlowAPI;

  var LF = {
    enabled: !!(window.LOOPFLOW_API_BASE && window.LOOPFLOW_API_BASE.length),
    user: null,        // current signed-in user, or null
    authorIndex: {},   // username -> userId, harvested from feed items (for follow)

    // ---- mapping -------------------------------------------------------
    // BeatView (server) -> the shape main.js's createBeatCard expects.
    mapView: function (v) {
      var author = v.author || {};
      if (author.username && author.id) LF.authorIndex[author.username] = author.id;
      return {
        id: v.id,
        title: v.title,
        author: author.username || "unknown",
        authorId: author.id || null,
        mood: v.mood || "custom",
        likes: v.likesCount || 0,
        genre: v.genre,
        bpm: v.bpm,
        grid: v.document ? v.document.grid : null,
        gridSteps: v.document ? v.document.gridSteps : null,
        serverBeat: true,
        likedByViewer: !!v.likedByViewer,
      };
    },

    // Capture the full creative state as the opaque server "document".
    snapshotDocument: function () {
      return {
        version: 1,
        grid: AppState.grid,
        gridSteps: AppState.gridSteps,
        bpm: AppState.bpm,
        pianoNotes: AppState.pianoNotes,
        fxActive: AppState.fxActive,
        fxSettings: AppState.fxSettings,
      };
    },

    // ---- lifecycle -----------------------------------------------------
    bootstrap: async function () {
      var authBtn = document.getElementById("auth-btn");
      var onbSignin = document.getElementById("onboarding-signin");
      if (!LF.enabled) {
        // offline mode: no auth UI anywhere
        if (authBtn) authBtn.style.display = "none";
        if (onbSignin) onbSignin.style.display = "none";
        return;
      }
      if (onbSignin) onbSignin.style.display = ""; // show "Sign in" on the first page
      api.configure({ baseUrl: window.LOOPFLOW_API_BASE });

      // Who am I? (cookie session). 401 simply means "logged out".
      try {
        LF.user = await api.me.get();
      } catch (e) {
        LF.user = null;
      }
      LF.updateAuthUI();

      // Discover feed is public — load it whether or not we're signed in.
      await LF.loadDiscover();

      // Saved creations require a session.
      if (LF.user) await LF.refreshMine();
    },

    updateAuthUI: function () {
      var label = document.getElementById("auth-label");
      var icon = document.getElementById("auth-icon");
      var name = document.getElementById("profile-name");
      var sub = document.getElementById("profile-sub");
      var onbSignin = document.getElementById("onboarding-signin");
      var guest = document.getElementById("guest-text");
      if (LF.user) {
        if (label) label.textContent = "Sign Out";
        if (icon) icon.className = "fas fa-sign-out-alt";
        if (name) name.textContent = LF.user.displayName || LF.user.username;
        if (sub) sub.textContent = "@" + LF.user.username;
        if (onbSignin) onbSignin.style.display = "none";
        if (guest) guest.textContent = "Signed in as @" + LF.user.username;
      } else {
        if (label) label.textContent = "Sign In";
        if (icon) icon.className = "fas fa-sign-in-alt";
        if (name) name.textContent = "Guest User";
        if (sub) sub.textContent = "Sign in to save your beats";
        if (onbSignin && LF.enabled) onbSignin.style.display = "";
        if (guest) guest.textContent = "No signup required";
      }
    },

    onAuthClick: async function () {
      if (LF.user) {
        try { await api.auth.logout(); } catch (e) {}
        LF.user = null;
        AppState.savedBeats = [];
        LF.updateAuthUI();
        if (typeof updateProfileStats === "function") updateProfileStats();
        if (typeof populateSavedFeed === "function") populateSavedFeed();
        if (typeof showToast === "function") showToast("Signed out", "info");
      } else {
        api.auth.startLogin(location.href);
      }
    },

    // ---- data ----------------------------------------------------------
    loadDiscover: async function () {
      try {
        var page = await api.feed.discover({ sort: "recent" });
        var items = (page && page.items) || [];
        AppState.discoverBeats = items.map(LF.mapView);
        // Seed liked state so hearts render correctly.
        AppState.discoverBeats.forEach(function (b) {
          if (b.likedByViewer) AppState.likedBeats.add(String(b.id));
        });
      } catch (e) {
        AppState.discoverBeats = [];
      }
      if (typeof populateDiscoveryFeed === "function") populateDiscoveryFeed();
    },

    refreshMine: async function () {
      try {
        var page = await api.beats.listMine();
        var items = (page && page.items) || [];
        AppState.savedBeats = items.map(LF.mapView);
      } catch (e) {
        // Leave whatever was loaded from localStorage in place.
      }
      if (typeof updateProfileStats === "function") updateProfileStats();
      if (typeof populateSavedFeed === "function") populateSavedFeed();
    },

    // Returns true if it handled the save on the server, false to fall back.
    createBeat: async function (localBeat) {
      try {
        await api.beats.create({
          title: localBeat.title || "Untitled Beat",
          genre: localBeat.genre,
          mood: localBeat.mood || "custom",
          bpm: localBeat.bpm,
          visibility: "public",
          document: LF.snapshotDocument(),
        });
        await LF.refreshMine();
        await LF.loadDiscover();
        if (typeof showToast === "function") showToast("Saved to your account!", "success");
        return true;
      } catch (e) {
        if (typeof showToast === "function") {
          showToast("Couldn't save to server — kept a local copy.", "error");
        }
        return false;
      }
    },

    // Load a server beat's full document into the editor.
    openBeat: async function (id) {
      try {
        var v = await api.beats.get(id);
        return LF.mapView(v);
      } catch (e) {
        return null;
      }
    },

    toggleLike: async function (id, nowLiked) {
      try {
        if (nowLiked) await api.beats.like(id);
        else await api.beats.unlike(id);
      } catch (e) { /* optimistic UI already updated */ }
    },

    toggleFollow: async function (username, nowFollowing) {
      var userId = LF.authorIndex[username];
      if (!userId) return;
      try {
        if (nowFollowing) await api.users.follow(userId);
        else await api.users.unfollow(userId);
      } catch (e) { /* optimistic UI already updated */ }
    },
  };

  window.LF = LF;
})();
