/* Abe Deal Report V3a interactive app (CCC)
 * Requires: window.ABE_DATA (from abe-data.js), mount markup (#abe-v3a … #abe-book)
 * No secrets. No HubSpot writes.
 */
(function () {
  "use strict";
  var DATA = window.ABE_DATA;
  if (!DATA || !DATA.deals) {
    console.error("[abe-v3a] window.ABE_DATA missing or empty. Load abe-data.js before abe-v3a.js.");
    var book = document.getElementById("abe-book");
    if (book) book.innerHTML = '<div class="abe-empty">Deal data failed to load. Scripts may be blocked — check abe-data.js / enqueue.</div>';
    return;
  }
  var state = { lens: "customer", filter: null, openGroups: {}, openDeals: {} };

  function blank(v) {
    return v === null || v === undefined || v === "";
  }
  function dash(v) {
    return blank(v) ? "—" : String(v);
  }
  function money(v) {
    if (blank(v)) return "—";
    var n = Math.round(Number(v));
    if (!isFinite(n)) return "—";
    var sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(n).toLocaleString("en-US");
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function dateOnly(v) {
    if (blank(v)) return "—";
    var s = String(v);
    if (s.length >= 10) return s.slice(0, 10);
    return s;
  }
  function customerKey(d) {
    var na = (d.national_account || "").trim();
    if (na) return na;
    var cn = (d.company_name || "").trim();
    if (cn) return cn;
    return "(No customer)";
  }
  function lensKey(d, lens) {
    if (lens === "territory") return (d.commercial_territory || "").trim() || "—";
    if (lens === "owner") return (d.owner_name || "").trim() || "—";
    if (lens === "stage") return (d.stage || "").trim() || "—";
    return customerKey(d);
  }
  function activityLabel(d) {
    var b = d.last_rep_touch_age_bucket || "none";
    var days = d.last_rep_touch_age_days;
    if (b === "fresh") return { cls: "fresh", text: "Active" + (blank(days) ? "" : " " + days + "d") };
    if (b === "cool") return { cls: "cool", text: "Cooling" + (blank(days) ? "" : " " + days + "d") };
    if (b === "stale") return { cls: "stale", text: "Inactive" + (blank(days) ? "" : " " + days + "d") };
    return { cls: "none", text: "Inactive · no touch" };
  }
  function hasCapital(d) {
    return !blank(d.capital_investment) || !blank(d.capital_probability) || !blank(d.need_to_fund_date);
  }
  function passesFilter(d) {
    var f = state.filter;
    if (!f) return true;
    if (f === "annual") return !blank(d.annualized_value);
    if (f === "monthly") return !blank(d.monthly_value);
    if (f === "blank_capital") return !hasCapital(d);
    if (f === "stale") {
      var b = d.last_rep_touch_age_bucket || "none";
      return b === "stale" || b === "none";
    }
    if (f === "pro_forma") return !blank(d.deal_costing_signed_off);
    return true;
  }
  function filteredDeals() {
    return (DATA.deals || []).filter(passesFilter);
  }
  function sumField(deals, key) {
    var t = 0, n = 0;
    for (var i = 0; i < deals.length; i++) {
      var v = deals[i][key];
      if (!blank(v) && isFinite(Number(v))) { t += Number(v); n++; }
    }
    return { total: t, n: n };
  }
  function formatAsOf(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short", year: "numeric", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit"
      }) + " CT";
    } catch (e) {
      return iso;
    }
  }

  function renderHeader() {
    var n = DATA.deal_count;
    var asof = formatAsOf(DATA.generated_at);
    document.getElementById("abe-asof").innerHTML =
      esc(asof) + "<br>" +
      esc(n) + " open big deals · Threshold $500K total contract (open, Standard + House)";
    document.getElementById("abe-basis").innerHTML =
      "<b>Basis:</b> Total contract = amount in home currency · Annual = annualized_value · " +
      "Monthly = annual ÷ 12 for Rental, EaaS, Service, Tear-Out only · Blank stays blank";
    var b = DATA.last_rep_age_buckets || {};
    document.getElementById("abe-legend").innerHTML =
      "<span class=\"abe-legend-title\">Activity</span>" +
      "<span class=\"abe-legend-item\"><span class=\"abe-dot fresh\">●</span> <b>Active</b> ≤7 days</span>" +
      "<span class=\"abe-legend-item\"><span class=\"abe-dot cool\">●</span> <b>Cooling</b> 8–14 days</span>" +
      "<span class=\"abe-legend-item\"><span class=\"abe-dot stale\">●</span> <b>Inactive</b> &gt;14 days or no touch</span>";
  }

  function tileDefs() {
    var annualBlank = DATA.annual_blank || 0;
    var monthlyN = sumField(DATA.deals || [], "monthly_value").n;
    var buckets = DATA.last_rep_age_buckets || {};
    return [
      { id: null, value: String(DATA.deal_count), label: "Big deals open", sub: "" },
      { id: null, value: money(DATA.amount_sum_usd), label: "Total contract", sub: "" },
      { id: "annual", value: money(DATA.annual_sum_usd), label: "Annual",
        sub: (DATA.deal_count - annualBlank) + " of " + DATA.deal_count + " · " + annualBlank + " blank" },
      { id: "blank_capital", value: String(DATA.blank_capital), label: "Blank capital",
        sub: "Investment not recorded" },
      { id: "stale", value: String(DATA.stale_count), label: "Stale > 14 days",
        sub: (buckets.fresh_le_7d || 0) + " fresh · " + (buckets.cool_8_14d || 0) + " cool · " +
             (buckets.stale_gt_14d || 0) + " stale · " + (buckets.none || 0) + " none" },
      { id: "pro_forma", value: (DATA.pro_forma_yes || 0) + " / " + (DATA.pro_forma_total || DATA.deal_count),
        label: "Pro forma", sub: "Costing signed off" },
      { id: "monthly", value: money(DATA.monthly_sum_usd), label: "Monthly",
        sub: "Recurring only · " + monthlyN + " deals" }
    ];
  }

  function renderTiles() {
    var el = document.getElementById("abe-tiles");
    el.innerHTML = tileDefs().map(function (t) {
      var active = state.filter === t.id && t.id !== null;
      return '<button type="button" class="abe-tile' + (active ? " is-active" : "") + '"' +
        (t.id ? ' data-filter="' + t.id + '"' : ' data-filter=""') +
        ' aria-pressed="' + (active ? "true" : "false") + '">' +
        '<div class="v">' + esc(t.value) + '</div>' +
        '<div class="l">' + esc(t.label) + '</div>' +
        (t.sub ? '<div class="s">' + esc(t.sub) + '</div>' : '') +
        '</button>';
    }).join("");
    el.querySelectorAll(".abe-tile").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        if (!f) { state.filter = null; }
        else if (state.filter === f) { state.filter = null; }
        else { state.filter = f; }
        state.openGroups = {};
        state.openDeals = {};
        renderAll();
      });
    });
  }

  function renderLenses() {
    var lenses = [
      { id: "customer", label: "Customer" },
      { id: "territory", label: "Territory" },
      { id: "owner", label: "Owner" },
      { id: "stage", label: "Stage" }
    ];
    var el = document.getElementById("abe-lenses");
    el.innerHTML = lenses.map(function (L) {
      return '<button type="button" class="abe-chip' + (state.lens === L.id ? " is-active" : "") +
        '" data-lens="' + L.id + '" role="tab" aria-selected="' + (state.lens === L.id) + '">' +
        esc(L.label) + '</button>';
    }).join("");
    el.querySelectorAll(".abe-chip").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.lens = btn.getAttribute("data-lens");
        state.openGroups = {};
        state.openDeals = {};
        renderAll();
      });
    });
  }

  function renderFilterPill() {
    var pill = document.getElementById("abe-filter-pill");
    var labels = {
      annual: "Filtered: Annual recorded",
      monthly: "Filtered: Monthly (recurring)",
      blank_capital: "Filtered: Blank capital",
      stale: "Filtered: Stale > 14 days",
      pro_forma: "Filtered: Pro forma signed off"
    };
    if (!state.filter) {
      pill.classList.remove("is-on");
      return;
    }
    document.getElementById("abe-filter-label").textContent = labels[state.filter] || state.filter;
    pill.classList.add("is-on");
  }

  function groupDeals(deals) {
    var map = {};
    for (var i = 0; i < deals.length; i++) {
      var d = deals[i];
      var k = lensKey(d, state.lens);
      if (!map[k]) map[k] = [];
      map[k].push(d);
    }
    var keys = Object.keys(map);
    keys.sort(function (a, b) {
      var sa = sumField(map[a], "amount_in_home_currency").total;
      var sb = sumField(map[b], "amount_in_home_currency").total;
      return sb - sa;
    });
    for (var j = 0; j < keys.length; j++) {
      map[keys[j]].sort(function (a, b) {
        return (Number(b.amount_in_home_currency) || 0) - (Number(a.amount_in_home_currency) || 0);
      });
    }
    return { keys: keys, map: map };
  }

  function cardHtml(d) {
    function row(label, value) {
      return "<dt>" + esc(label) + "</dt><dd>" + esc(dash(value)) + "</dd>";
    }
    var act = activityLabel(d);
    var moneyBlock =
      row("Total contract", money(d.amount_in_home_currency)) +
      row("Annual", money(d.annualized_value)) +
      row("Monthly", money(d.monthly_value)) +
      row("Term (months)", blank(d.term_months) ? "—" : d.term_months) +
      row("Term revenue", money(d.term_revenue));
    var capitalBlock =
      row("Capital investment", money(d.capital_investment)) +
      row("Investment source", d.capital_investment_source) +
      row("Capital probability", d.capital_probability) +
      row("Need to fund", dateOnly(d.need_to_fund_date)) +
      row("Expected delivery", dateOnly(d.expected_delivery_date));
    var touchBlock =
      row("Touches last 7d", blank(d.touches_last_7d) && d.touches_last_7d !== 0 ? "—" : d.touches_last_7d) +
      row("Touches prior 7d", blank(d.touches_prior_7d) && d.touches_prior_7d !== 0 ? "—" : d.touches_prior_7d) +
      row("Last rep touch", dateOnly(d.last_rep_touch)) +
      row("Touch type", d.last_rep_touch_type) +
      row("Age", act.text) +
      row("Activity health", d.rep_activity_health);
    var oppBlock =
      row("Pipeline", d.pipeline) +
      row("Stage", d.stage) +
      row("Deal type", d.dealtype) +
      row("Created", dateOnly(d.createdate)) +
      row("Close", dateOnly(d.closedate)) +
      row("Next step", d.hs_next_step) +
      row("Next activity", dateOnly(d.notes_next_activity_date)) +
      row("Costing signed off", dateOnly(d.deal_costing_signed_off)) +
      row("Hygiene", d.hygiene_flags);
    var acctBlock =
      row("Company", d.company_name) +
      row("National account", d.national_account) +
      row("Territory", d.commercial_territory) +
      row("Segment", d.segment) +
      row("Owner", d.owner_name);
    var desc = blank(d.description) ? "" :
      '<div class="abe-desc"><b>Summary</b><br>' + esc(d.description) + "</div>";
    return '<div class="abe-card-grid">' +
      '<div class="abe-card-sec"><h4>Opportunity</h4><dl class="abe-kv">' + oppBlock + "</dl></div>" +
      '<div class="abe-card-sec"><h4>Account</h4><dl class="abe-kv">' + acctBlock + "</dl></div>" +
      '<div class="abe-card-sec"><h4>Money</h4><dl class="abe-kv">' + moneyBlock + "</dl></div>" +
      '<div class="abe-card-sec"><h4>Capital</h4><dl class="abe-kv">' + capitalBlock + "</dl></div>" +
      '<div class="abe-card-sec"><h4>Touches / activity</h4><dl class="abe-kv">' + touchBlock + "</dl></div>" +
      "</div>" + desc +
      '<a class="abe-hs" href="' + esc(d.record_url) + '" target="_blank" rel="noopener">Open in HubSpot</a>';
  }

  function renderBook() {
    var deals = filteredDeals();
    var grouped = groupDeals(deals);
    var lensLabel = ({ customer: "customer", territory: "territory", owner: "owner", stage: "stage" })[state.lens];
    document.getElementById("abe-book-title").textContent = "Deal book by " + lensLabel;
    document.getElementById("abe-book-sub").textContent =
      deals.length + " deals shown · Click a group to expand · Click a deal for the detail card · " +
      "HubSpot link on every card";

    var book = document.getElementById("abe-book");
    if (!grouped.keys.length) {
      book.innerHTML = '<div class="abe-empty">No deals match this filter.</div>';
      return;
    }
    book.innerHTML = grouped.keys.map(function (key) {
      var list = grouped.map[key];
      var amt = sumField(list, "amount_in_home_currency");
      var ann = sumField(list, "annualized_value");
      var mon = sumField(list, "monthly_value");
      var gid = "g:" + state.lens + ":" + key;
      var open = !!state.openGroups[gid];
      var dealsHtml = list.map(function (d) {
        var did = "d:" + d.id;
        var dOpen = !!state.openDeals[did];
        var act = activityLabel(d);
        var owner = (d.owner_name || "").trim();
        var initials = owner ? owner.split(/\s+/).map(function(p){return p[0]||"";}).join("").slice(0,2).toUpperCase() : "—";
        var who = owner
          ? '<span class="who point"><i>' + esc(initials) + '</i><span class="nm">' + esc(owner) + '</span></span>'
          : '<span class="who"><i>—</i><span class="nm">—</span></span>';
        var sub = [
          esc(dash(d.stage)),
          who,
          esc(dash(d.commercial_territory)),
          "Close " + esc(dateOnly(d.closedate)),
          '<span class="abe-dot ' + act.cls + '">●</span> ' + esc(act.text)
        ].join(" · ");
        return '<div class="abe-deal' + (dOpen ? " is-open" : "") + '" data-deal-id="' + esc(d.id) + '">' +
          '<button type="button" class="abe-deal-hd" aria-expanded="' + dOpen + '">' +
          '<span class="caret"></span>' +
          '<span><div class="abe-deal-name">' + esc(d.name) + '</div>' +
          '<div class="abe-deal-sub">' + sub + '</div></span>' +
          '<span class="abe-money"><span class="lbl">Total contract</span>' + money(d.amount_in_home_currency) + "</span>" +
          '<span class="abe-money"><span class="lbl">Annual</span>' + money(d.annualized_value) + "</span>" +
          '<span class="abe-money"><span class="lbl">Monthly</span>' + money(d.monthly_value) + "</span>" +
          "</button>" +
          '<div class="abe-card">' + cardHtml(d) + "</div>" +
          "</div>";
      }).join("");
      return '<div class="abe-group' + (open ? " is-open" : "") + '" data-group-id="' + esc(gid) + '">' +
        '<button type="button" class="abe-group-hd" aria-expanded="' + open + '">' +
        '<span class="caret"></span>' +
        '<span><div class="name">' + esc(key) + '</div>' +
        '<div class="meta">' + list.length + " deal" + (list.length === 1 ? "" : "s") + "</div></span>" +
        '<span class="sums"><b>' + money(amt.total) + '</b> total contract' +
        "<br>Annual " + (ann.n ? money(ann.total) : "—") +
        " · Monthly " + (mon.n ? money(mon.total) : "—") + "</span>" +
        "</button>" +
        '<div class="abe-group-body">' + dealsHtml + "</div>" +
        "</div>";
    }).join("");

    book.querySelectorAll(".abe-group-hd").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var g = btn.closest(".abe-group");
        var id = g.getAttribute("data-group-id");
        state.openGroups[id] = !state.openGroups[id];
        g.classList.toggle("is-open", !!state.openGroups[id]);
        btn.setAttribute("aria-expanded", !!state.openGroups[id]);
      });
    });
    book.querySelectorAll(".abe-deal-hd").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest(".abe-deal");
        var id = "d:" + row.getAttribute("data-deal-id");
        state.openDeals[id] = !state.openDeals[id];
        row.classList.toggle("is-open", !!state.openDeals[id]);
        btn.setAttribute("aria-expanded", !!state.openDeals[id]);
      });
    });
  }

  function renderAll() {
    renderHeader();
    renderTiles();
    renderLenses();
    renderFilterPill();
    renderBook();
  }

  document.getElementById("abe-filter-clear").addEventListener("click", function () {
    state.filter = null;
    state.openGroups = {};
    state.openDeals = {};
    renderAll();
  });

  renderAll();
})();
