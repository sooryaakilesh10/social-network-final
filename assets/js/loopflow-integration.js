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
        comments: v.commentsCount || 0,
        genre: v.genre,
        bpm: v.bpm,
        visibility: v.visibility || "private",
        description: v.document ? (v.document.description || "") : "",
        grid: v.document ? v.document.grid : null,
        gridSteps: v.document ? v.document.gridSteps : null,
        pianoNotes: v.document ? (v.document.pianoNotes || []) : null,
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
      var feedTabs = document.getElementById("feed-tabs");
      var suggested = document.getElementById("suggested-creators");
      if (!LF.enabled) {
        // offline mode: no auth/recommendation UI anywhere
        if (authBtn) authBtn.style.display = "none";
        if (onbSignin) onbSignin.style.display = "none";
        if (feedTabs) feedTabs.style.display = "none";
        if (suggested) suggested.style.display = "none";
        return;
      }
      if (onbSignin) onbSignin.style.display = ""; // show "Sign in" on the first page
      if (feedTabs) feedTabs.style.display = "";   // For You / Following / Trending
      api.configure({ baseUrl: window.LOOPFLOW_API_BASE });

      // Who am I? (cookie session). The API client transparently refreshes the
      // access token once on a 401; a still-401 simply means "logged out".
      try {
        LF.user = await api.me.get();
      } catch (e) {
        LF.user = null;
      }
      LF.updateAuthUI();

      // Seed which artists the viewer already follows BEFORE rendering the
      // feed, so follow buttons render in the right state after a refresh.
      if (LF.user) await LF.loadFollowing();

      // Discover feed — personalized "For You" ranking by default.
      await LF.loadDiscover(AppState.discoverMode || "foryou");

      // Saved creations + suggested creators require a session.
      if (LF.user) {
        await LF.refreshMine();
        await LF.loadSuggested();
      }
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
        // Sign out: revoke the refresh token + clear the session cookies on the
        // server, then reset the UI to the logged-out state.
        try { await api.auth.logout(); } catch (e) {}
        LF.user = null;
        AppState.savedBeats = [];
        AppState.followedArtists.clear();
        LF.updateAuthUI();
        var suggested = document.getElementById("suggested-creators");
        if (suggested) suggested.style.display = "none";
        if (typeof updateProfileStats === "function") updateProfileStats();
        if (typeof populateSavedFeed === "function") populateSavedFeed();
        LF.loadDiscover("foryou");
        if (typeof showToast === "function") showToast("Signed out", "info");
      } else {
        // Sign in: hand off to Google OAuth. The backend sets HttpOnly session
        // cookies and redirects back here (redirect_to); bootstrap() then
        // resolves the signed-in user via /api/me.
        api.auth.startLogin(location.href);
      }
    },

    // ---- data ----------------------------------------------------------
    // mode: "foryou" (personalized) | "following" (friends) | "top" (trending)
    loadDiscover: async function (mode) {
      mode = mode || AppState.discoverMode || "foryou";
      AppState.discoverMode = mode;
      // Reflect the active feed tab.
      var tabs = document.querySelectorAll(".feed-tab");
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle("active", tabs[i].getAttribute("data-mode") === mode);
      }
      try {
        var page = await api.feed.discover({ sort: mode });
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

    // Suggested creators to follow (friends-of-friends + popular).
    loadSuggested: async function () {
      var el = document.getElementById("suggested-creators");
      if (!el) return;
      if (!LF.user) { el.style.display = "none"; return; }
      try {
        var users = await api.recommendations.users(10);
        LF.renderSuggested(users || []);
      } catch (e) {
        el.style.display = "none";
      }
    },

    renderSuggested: function (users) {
      var el = document.getElementById("suggested-creators");
      if (!el) return;
      if (!users.length) { el.style.display = "none"; return; }
      el.style.display = "";
      var esc = function (s) { return String(s == null ? "" : s).replace(/[<>&"']/g, ""); };
      var cards = users.map(function (u) {
        if (u && u.id && u.username) LF.authorIndex[u.username] = u.id;
        var name = esc(u.displayName || u.username);
        var handle = esc(u.username);
        return '<div class="suggest-card">'
          + '<div class="suggest-avatar"><i class="fas fa-user"></i></div>'
          + '<div class="suggest-name">' + name + '</div>'
          + '<div class="suggest-handle">@' + handle + '</div>'
          + '<button class="suggest-follow" onclick="followSuggested(\'' + esc(u.id) + '\',\'' + handle + '\', this)">Follow</button>'
          + '</div>';
      }).join("");
      el.innerHTML = '<div class="suggest-title">Suggested creators</div><div class="suggest-row">' + cards + '</div>';
    },

    // Seed AppState.followedArtists (and authorIndex, for later unfollows) from
    // the server so follow state survives a page refresh. Paginates through all
    // followed users.
    loadFollowing: async function () {
      if (!LF.user) return;
      try {
        var cursor = null;
        do {
          var page = await api.me.following(cursor);
          var items = (page && page.items) || [];
          items.forEach(function (u) {
            if (u && u.username) {
              AppState.followedArtists.add(u.username);
              if (u.id) LF.authorIndex[u.username] = u.id;
            }
          });
          cursor = page && page.nextCursor;
        } while (cursor);
      } catch (e) { /* keep whatever state we have */ }
      if (typeof populateFollowingList === "function") populateFollowingList();
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

    // Save a PRIVATE beat to the user's account (shows in "Saved", NOT in
    // Discover). Returns true if handled on the server, false to fall back.
    createBeat: async function (localBeat) {
      try {
        var beat = await api.beats.create({
          title: localBeat.title || "Untitled Beat",
          genre: localBeat.genre,
          mood: localBeat.mood || "custom",
          bpm: localBeat.bpm,
          visibility: "private",
          document: LF.snapshotDocument(),
        });
        // Remember it so a later "Share" publishes this exact beat.
        if (beat && beat.id) AppState.currentBeatId = beat.id;
        await LF.refreshMine();
        if (typeof showToast === "function") showToast("Saved to your account", "success");
        return true;
      } catch (e) {
        if (typeof showToast === "function") {
          showToast("Couldn't save to server — kept a local copy.", "error");
        }
        return false;
      }
    },

    // Publish the CURRENT editor beat to Discover (like posting). Updates the
    // beat we're editing if it exists, otherwise creates a public one.
    shareBeat: async function (meta) {
      meta = meta || {};
      try {
        if (AppState.currentBeatId) {
          await api.beats.update(AppState.currentBeatId, {
            visibility: "public",
            document: LF.snapshotDocument(),
            title: meta.title || "Untitled Beat",
            genre: meta.genre,
            bpm: meta.bpm,
          });
        } else {
          var beat = await api.beats.create({
            title: meta.title || "Untitled Beat",
            genre: meta.genre,
            mood: meta.mood || "custom",
            bpm: meta.bpm,
            visibility: "public",
            document: LF.snapshotDocument(),
          });
          if (beat && beat.id) AppState.currentBeatId = beat.id;
        }
        await LF.refreshMine();
        await LF.loadDiscover();
        if (typeof showToast === "function") showToast("Posted to Discover!", "success");
        return true;
      } catch (e) {
        if (typeof showToast === "function") showToast("Couldn't post to Discover.", "error");
        return false;
      }
    },

    // Publish a specific already-saved beat (from the Saved tab) to Discover.
    // meta: { title, description } gathered from the Post modal. The backend
    // has no description column, so it rides along inside the opaque document
    // blob (merged into the beat's existing document).
    publishBeat: async function (id, meta) {
      meta = meta || {};
      try {
        var patch = { visibility: "public" };
        if (meta.title) patch.title = meta.title;
        if (meta.description !== undefined) {
          // Fetch the current document so we don't clobber the creative payload.
          var current = await api.beats.get(id);
          var doc = (current && current.document) || {};
          doc.description = meta.description;
          patch.document = doc;
        }
        await api.beats.update(id, patch);
        await LF.refreshMine();
        await LF.loadDiscover();
        if (typeof showToast === "function") showToast("Posted to Discover!", "success");
        return true;
      } catch (e) {
        if (typeof showToast === "function") showToast("Couldn't post to Discover.", "error");
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

    // Delete one of the user's beats on the backend, then resync local state
    // (saved list + DB-backed profile stats). Returns true on success.
    deleteBeat: async function (id) {
      try {
        await api.beats.remove(id);
        AppState.savedBeats = AppState.savedBeats.filter(function (b) {
          return String(b.id) !== String(id);
        });
        // Refresh /api/me so beatsCount/etc. reflect the deletion.
        try { LF.user = await api.me.get(); } catch (e) { /* keep stale counts */ }
        if (typeof populateSavedFeed === "function") populateSavedFeed();
        if (typeof updateProfileStats === "function") updateProfileStats();
        return true;
      } catch (e) {
        if (typeof showToast === "function") showToast("Couldn't remove beat.", "error");
        return false;
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

    // ---- comments ------------------------------------------------------
    // Fetch the newest comments for a beat. Returns [] on any failure so the
    // UI can degrade gracefully (offline / not configured).
    loadComments: async function (beatId) {
      try {
        var page = await api.comments.list(beatId, { limit: 50 });
        return (page && page.items) || [];
      } catch (e) {
        return [];
      }
    },

    // Post a comment. Returns the created comment view, or null on failure.
    addComment: async function (beatId, body) {
      try {
        return await api.comments.add(beatId, body);
      } catch (e) {
        if (typeof showToast === "function") {
          showToast(e && e.status === 401 ? "Sign in to comment." : "Couldn't post comment.", "error");
        }
        return null;
      }
    },

    // Delete a comment (author or beat owner). Returns true on success.
    deleteComment: async function (commentId) {
      try {
        await api.comments.remove(commentId);
        return true;
      } catch (e) {
        if (typeof showToast === "function") showToast("Couldn't delete comment.", "error");
        return false;
      }
    },
  };

  window.LF = LF;
})();
