// LoopFlow API client — browser global build (classic script, no ES modules).
//
// Exposes `window.LoopFlowAPI`. Base URL comes from window.LOOPFLOW_API_BASE
// (see loopflow-config.js). Auth is cookie-based (HttpOnly); every call sends
// credentials and transparently refreshes the access token once on a 401.
//
// This mirrors backend/client/loopflow-api.js (the ESM source of truth) but is
// attached to `window` so main.js (a classic script) can use it without imports.
(function () {
  "use strict";

  var config = { baseUrl: window.LOOPFLOW_API_BASE || "" };

  function configure(opts) {
    config = Object.assign({}, config, opts);
  }

  function ApiError(status, code, message) {
    var e = new Error(message || code);
    e.name = "ApiError";
    e.status = status;
    e.code = code;
    return e;
  }

  var refreshing = null; // de-dupe concurrent refreshes

  function buildUrl(path, query) {
    var url = new URL(config.baseUrl + path, config.baseUrl || location.origin);
    if (query) {
      Object.keys(query).forEach(function (k) {
        var v = query[k];
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }
    return url;
  }

  async function request(method, path, opts, _retried) {
    opts = opts || {};
    var url = buildUrl(path, opts.query);

    var headers = {};
    var payload;
    if (opts.raw !== undefined) {
      payload = opts.raw;
      if (opts.contentType) headers["content-type"] = opts.contentType;
    } else if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(opts.body);
    }

    var res = await fetch(url, {
      method: method,
      headers: headers,
      body: payload,
      credentials: "include",
    });

    // Transparent one-shot refresh on expiry.
    if (res.status === 401 && !_retried && path.indexOf("/auth/") !== 0) {
      if (!refreshing) {
        refreshing = fetch(config.baseUrl + "/auth/refresh", {
          method: "POST",
          credentials: "include",
        }).finally(function () { refreshing = null; });
      }
      var refreshed = await refreshing;
      if (refreshed.ok) return request(method, path, opts, true);
    }

    if (res.status === 204) return null;

    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var err = data.error || {};
      throw ApiError(res.status, err.code || "ERROR", err.message);
    }
    return data;
  }

  window.LoopFlowAPI = {
    configure: configure,
    ApiError: ApiError,
    get baseUrl() { return config.baseUrl; },

    auth: {
      startLogin: function (redirectTo) {
        var u = buildUrl("/auth/google/start");
        u.searchParams.set("redirect_to", redirectTo || location.href);
        location.assign(u.toString());
      },
      refresh: function () { return request("POST", "/auth/refresh"); },
      logout: function () { return request("POST", "/auth/logout"); },
    },

    me: {
      get: function () { return request("GET", "/api/me").then(function (d) { return d.user; }); },
      update: function (patch) { return request("PATCH", "/api/me", { body: patch }).then(function (d) { return d.user; }); },
      following: function (cursor) { return request("GET", "/api/me/following", { query: { cursor: cursor } }); },
    },

    beats: {
      create: function (beat) { return request("POST", "/api/beats", { body: beat }).then(function (d) { return d.beat; }); },
      get: function (id) { return request("GET", "/api/beats/" + id).then(function (d) { return d.beat; }); },
      update: function (id, patch) { return request("PUT", "/api/beats/" + id, { body: patch }).then(function (d) { return d.beat; }); },
      remove: function (id) { return request("DELETE", "/api/beats/" + id); },
      listMine: function (cursor, limit) { return request("GET", "/api/me/beats", { query: { cursor: cursor, limit: limit } }); },
      play: function (id) { return request("POST", "/api/beats/" + id + "/play"); },
      like: function (id) { return request("POST", "/api/beats/" + id + "/like"); },
      unlike: function (id) { return request("DELETE", "/api/beats/" + id + "/like"); },
    },

    feed: {
      discover: function (opts) { return request("GET", "/api/feed", { query: opts || {} }); },
    },

    users: {
      profile: function (username) { return request("GET", "/api/users/" + username).then(function (d) { return d.user; }); },
      follow: function (id) { return request("POST", "/api/users/" + id + "/follow"); },
      unfollow: function (id) { return request("DELETE", "/api/users/" + id + "/follow"); },
    },

    recommendations: {
      // Suggested creators to follow (friends-of-friends + popular).
      users: function (limit) { return request("GET", "/api/recommendations/users", { query: { limit: limit } }).then(function (d) { return (d && d.users) || []; }); },
    },
  };
})();
