/**
 * Tracker Functions
 *
 * This module handles tracker tab operations including auto assignment,
 * rendering tracker table with status/due date filtering and sorting,
 * and helper functions for tracker interactions.
 */

import { $, setText, esc, attr, notify, toLocalYMD, firstName, looksLikeUrl, canonicalizeSharePointLink } from './utils.js';
import { storage } from './storage.js';

// Global filter/sort state for tracker due date filter + sort
let activeStatusFilters = new Set();
let dueSort = null;
let trkDateFilter = ""; // yyyy-mm-dd or empty (stored as local date)

// Build status dropdown
export function buildStatusDropdown(uniqueStatuses) {
    const dd = $("status-dropdown");
    if (!dd) return;
    dd.innerHTML = uniqueStatuses.map(st => {
        const isActive = activeStatusFilters.has(st);
        return `
            <div class="status-option ${isActive ? "active" : ""}"
                 onclick="event.stopPropagation(); toggleStatusHighlight('${st}', this)">
              ${st}
            </div>`;
    }).join("");
}

// Toggle status highlight
export function toggleStatusHighlight(status, el, renderTracker) {
    const wasActive = el.classList.contains("active");
    el.classList.toggle("active");
    if (wasActive) activeStatusFilters.delete(status);
    else activeStatusFilters.add(status);
    renderTracker();
}

// Toggle due sort
export function toggleDueSort(order, el, renderTracker) {
    if (dueSort === order) {
        dueSort = null; document.querySelectorAll(".sort-option").forEach(opt => opt.classList.remove("active"));
    } else {
        dueSort = order;
        document.querySelectorAll(".sort-option").forEach(opt => opt.classList.remove("active"));
        if (el) el.classList.add("active");
    }
    $("due-popup").classList.remove("show");
    renderTracker();
}

// Main render tracker function
export function renderTracker(app, renderReviewerDashboard, openDetail) {
    const tab = app.activeTab;
    app.trackerData = []; // reset for dashboard summary

    if (!tab) { setText("trk-meta", "No dataset selected"); const b = $("trk-body"); if (b) b.innerHTML = ""; return; }
    $("trk-match").innerHTML = tab.headers.map(h => `<option ${h === tab.matchColumn ? "selected" : ""}>${esc(h)}</option>`).join("");
    const matchCol = $("trk-match").value;

    let projects = [...new Set((tab.data || []).map(r => String(r[matchCol] || "").trim()).filter(Boolean))];

    // Exclude projects that are fully hidden (i.e., all dataset rows for the project have _hidden true).
    projects = projects.filter(p => (tab.data || []).some(r => String(r[matchCol] || "").trim() === p && !r._hidden));

    // assignments are already scoped: app.assignments is a map project -> [assignees]
    const assigns = app.assignments || {};
    if (app.assigneeQuery) {
        projects = projects.filter(p => (assigns[p] || []).some(a => (a || "").toLowerCase().includes(app.assigneeQuery)));
    }

    // Build the set of unique assigned due dates for the due-popup selector (use local yyyy-mm-dd)
    const dateSet = new Set();
    projects.forEach(p => {
        const tabLocal = app.activeTab;
        const matchLocal = tabLocal.matchColumn || tabLocal.headers?.[0];
        const row = (tabLocal.data || []).find(r => String(r[matchLocal] || "").trim() === p) || {};
        const rawDate = (app.proposalDue && app.proposalDue[p]) || row["Due Date"] || row.Due || "";
        const ymd = toLocalYMD(rawDate);
        if (ymd) dateSet.add(ymd);
    });
    const dates = Array.from(dateSet).sort();

    // Populate due-popup's select (if present)
    const dueFilterSel = $("due-filter");
    if (dueFilterSel) {
        dueFilterSel.innerHTML = `<option value="">All dates</option>` + dates.map(d => {
            const human = new Date(d + "T00:00:00").toLocaleDateString();
            return `<option value="${d}">${esc(human)}</option>`;
        }).join("");
        // keep previously-selected filter if present
        dueFilterSel.value = trkDateFilter || "";
        dueFilterSel.onchange = () => { trkDateFilter = dueFilterSel.value || ""; renderTracker(app, renderReviewerDashboard, openDetail); };
    }

    const tbody = $("trk-body"); if (!tbody) return;

    // Build rows using safe data attributes (encodeURIComponent) to avoid breaking inline handlers when project names contain quotes / ampersands.
    tbody.innerHTML = projects.map(p => {
        const assignees = assigns[p] || [];
        const survs = app.surveys.filter(s => s.projectName === p);
        // Use first-name matching for submission detection:
        const submitters = [...new Set(survs.map(s => s.reviewerName || ""))];
        const submitterFirstSet = new Set(submitters.map(n => firstName(n)));
        const notesCount = survs.filter(s => (s.overall || s.lineItems || s.funding)).length;

        const amt = app.proposalAmounts[p];
        const statusVal = app.proposalStatus[p];
        const amountFilled = (amt != null && amt !== "" && parseFloat(amt) > 0);
        const statusFilled = (statusVal != null && statusVal !== "");

        const approvedRec = app.approved.data.find(r => r["Project Name"] === p);

        // Look up Requested Amount from dataset
        const tabLocal = app.activeTab;
        const matchLocal = tabLocal.matchColumn || tabLocal.headers?.[0];
        const row = (tabLocal.data || []).find(r => String(r[matchLocal] || "").trim() === p) || {};

        const reqKey = ["Amount", "Requested Amount", "Amount Requested", "Total Requested",
            "Submission Amount", "Budget", "Q7"]
            .find(k => row[k] != null && row[k] !== "");

        const requested = reqKey
            ? "$" + Number(String(row[reqKey]).replace(/[^0-9.\-]/g, "") || 0)
                .toLocaleString(undefined, { maximumFractionDigits: 2 })
            : "—";

        let label, cls;
        if (approvedRec) { label = "Approved"; cls = "st-approve"; }
        else if (assignees.length === 0) { label = "Unassigned"; cls = "st-unassigned"; }
        else if (!amountFilled && !statusFilled && assignees.length > 0 && notesCount >= assignees.length) { label = "Ready for Review"; cls = "st-ready"; }
        else if (statusFilled) { label = "Waiting Approval"; cls = "st-wait"; }
        else { label = "Under Review"; cls = "st-under"; }

        // === NEW: Feed data to dashboard reviewer summary ===
        app.trackerData ||= []; // ensure it exists
        assignees.forEach(name => {
            if (!name) return;
            const reviewer = name.trim();
            // find a submission by comparing first-names (robust when survey stores full name)
            const submission = survs.find(s => firstName(s.reviewerName) === firstName(reviewer));
            app.trackerData.push({
                "Reviewer": reviewer,
                "Project Name": p,
                "Status": label,
                "Due Date": app.proposalDue?.[p] || row["Due Date"] || "",
                "timestamp": submission?.timestamp || null
            });
        });


        // Dual display: Requested vs Given
        const amtDisp = `
            <div style="display:flex;flex-direction:column;gap:2px;line-height:1.3">
                <div><span class="text-muted text-sm">Req:</span> <strong style="color:#10B981">${requested}</strong></div>
                <div><span class="text-muted text-sm">Given:</span> <strong style="color:#FBBF24">${amountFilled
                ? "$" + Number(amt).toLocaleString(undefined, { maximumFractionDigits: 2 })
                : "—"}</strong></div>
            </div>`;

        // Build assignee HTML with data attributes and percent-encoding for safety.
        const assigneeHtml = assignees.length
            ? `<span class="assignees" title="${esc(assignees.join(', '))}" style="display:block;margin-top:6px;color:#94A3B8;font-size:12px">` +
            assignees.slice(0, 8).map(n => {
                const aFirst = firstName(n);
                const submitted = submitterFirstSet.has(aFirst);
                // highlight by first-name match; remove checkmark (user requested)
                const style = submitted ? "color:#3B82F6;font-weight:800;text-decoration:underline;cursor:pointer" : "text-decoration:underline;cursor:pointer";
                return `<span class="assignee-name" data-action="assignee" data-project="${encodeURIComponent(p)}" data-assignee="${encodeURIComponent(n)}" style="${style}">${esc(n)}</span>`;
            }).join(" ") +
            (assignees.length > 8 ? ` <span>…</span>` : "") +
            `</span>`
            : `<span class="assignees" style="display:block;margin-top:6px;color:#94A3B8;font-size:12px">—</span>`;

        const submitBtnHtml = `<button class="btn btn-success btn-sm" data-action="submit">Submit</button>`;
        // normalize stored due (use local yyyy-mm-dd for date input)
        const dueVal = toLocalYMD(app.proposalDue[p] || row["Due Date"] || row.Due || "");

        // store project as encoded value in data attribute to avoid breaking HTML/JS when project contains quotes, ampersands, etc.
        return `<tr data-project="${encodeURIComponent(p)}">
                    <td title="${esc(p)}"><span class="proj-name" style="max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom">${esc(p)}</span></td>
                    <td>${amtDisp}</td>
                    <td>
                        <div><strong>Submitted:</strong> ${submitters.length}</div>
                        <div><strong>Assigned:</strong> ${assignees.length}</div>
                        ${assigneeHtml}
                    </td>
                    <td><span class="status-badge ${cls}">${label}</span></td>
                    <td class="actions-col">
                        <button class="btn btn-sm" data-action="details">Details</button>
                        ${submitBtnHtml}
                    </td>
                    <td>
                        <input type="date" data-action="due" value="${dueVal}" />
                    </td>
                </tr>`;
    }).join("");

    setText("trk-meta", `${projects.length} project(s)`);
    renderReviewerDashboard(app);

    // Attach event listeners after HTML is inserted to avoid inline JS injection problems
    tbody.querySelectorAll('tr').forEach(tr => {
        const projEncoded = tr.getAttribute('data-project') || "";
        const project = projEncoded ? decodeURIComponent(projEncoded) : "";

        // Details button
        const detailsBtn = tr.querySelector('button[data-action="details"]');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openDetail(project);
            });
        }

        // Submit button
        const submitBtn = tr.querySelector('button[data-action="submit"]');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                app_goSubmit(project);
            });
        }

        // Due date input
        const dueInput = tr.querySelector('input[data-action="due"]');
        if (dueInput) {
            dueInput.addEventListener('change', (e) => {
                e.stopPropagation();
                app_saveDueDate(project, dueInput.value, app);
            });
        }

        // Assignee name clicks (open detail & focus)
        tr.querySelectorAll('[data-action="assignee"]').forEach(span => {
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                const assignee = span.getAttribute('data-assignee') ? decodeURIComponent(span.getAttribute('data-assignee')) : "";
                app_openDetailAndFocus(project, assignee, e, openDetail);
            });
        });
    });

    // === Calculate live Given Amount total ===
    let totalGiven = 0;
    projects.forEach(p => {
        const amt = app.proposalAmounts[p];
        const val = parseFloat((amt || "0").toString().replace(/[^0-9.-]/g, ""));
        if (!isNaN(val)) totalGiven += val;
    });

    const totalGivenFormatted = "$" + totalGiven.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    const amtHeader = document.querySelector('#trk-table thead th:nth-child(2) .th-inner');
    if (amtHeader) {
        amtHeader.innerHTML = `
            <span class="text-muted" style="text-transform:uppercase; font-size:12px; letter-spacing:0.5px;">
                G.Amt:
            </span>
            <span style="color: var(--amber); font-weight:800; font-size:12px; margin-left:6px;">
                ${totalGivenFormatted}
            </span>
        `;
    }
}

// Window helper functions
window.app_openDetailAndFocus = (project, reviewer, evt, openDetail) => {
    if (evt) evt.stopPropagation();
    openDetail(project);
};

window.app_goSubmit = (project) => {
    // First update the form value
    const form = $("survey");
    if (form && form.projectName) {
        form.projectName.value = project;
        // Trigger input event to ensure the value is recognized
        const inputEvent = new Event('input', { bubbles: true });
        form.projectName.dispatchEvent(inputEvent);
    }
    if ($("svy-filter")) $("svy-filter").value = project;

    // Then switch to Survey section which will update everything
    showSection("Survey");

    // Scroll to form
    const y = form ? form.getBoundingClientRect().top + window.scrollY - 90 : 0;
    window.scrollTo({ top: y, behavior: "smooth" });
    setTimeout(() => (form?.overall || form?.projectName)?.focus(), 150);
};

window.app_saveDueDate = async (project, value, app) => {
    // value should be yyyy-mm-dd; store it as provided
    await storage.saveProposalField(app.selectedId, project, { dueDate: value || "" });
    app.proposalDue[project] = value || "";
    notify("Due date saved", "success");
};

// Helper function to get proposal URL
export function getProposalUrl(project, tab, matchCol) {
    if (!tab || !matchCol || !project) return null;
    const idx = tab.data.findIndex(r => String(r[matchCol] || "").trim().toLowerCase() === String(project).trim().toLowerCase());
    if (idx < 0) return null;

    const row = tab.data[idx];
    const rowLinks = tab.linkMap?.[idx];
    const pref = ["Proposal", "Proposal Link", "Link", "URL", "Application", "Document", "Doc", "Attachment"];

    if (rowLinks) {
        for (const h of pref) { if (rowLinks[h]) return canonicalizeSharePointLink(rowLinks[h]); }
        const first = Object.values(rowLinks).find(Boolean);
        if (first) return canonicalizeSharePointLink(first);
    }

    // fallback: scan raw row values for an http(s) URL
    for (const k of Object.keys(row || {})) {
        const v = String(row[k] ?? "").trim();
        if (looksLikeUrl(v)) return canonicalizeSharePointLink(v);
    }

    return null;
}

// Export filter/sort state and functions for post-processing
export { activeStatusFilters, dueSort, trkDateFilter };

export function openAutoAssignModal(app) {
    const modal = $("auto-assign-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    const cfg = app.autoAssignConfig || { meetingDates: [], reviewerCount: 2, reviewerPool: [] };
    const datesInput = cfg.meetingDates?.join("\n") || "";
    $("auto-dates").value = datesInput;
    $("auto-count").value = cfg.reviewerCount || 2;
    $("auto-reviewers").value = (cfg.reviewerPool || []).join("\n");
}

export function closeAutoAssignModal() {
    const modal = $("auto-assign-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = "";
}

export async function runAutoAssign(app, rerenderTracker, rerenderDashboard) {
    const modal = $("auto-assign-modal");
    if (!modal) return;
    const rawDates = $("auto-dates").value || "";
    const reviewerCount = Math.max(1, parseInt($("auto-count").value, 10) || 2);
    const reviewerPoolRaw = $("auto-reviewers")?.value || "";
    const reviewerPool = reviewerPoolRaw
        .split(/\n|,/)
        .map(x => x.trim())
        .filter(Boolean);

    const meetingDates = Array.from(new Set(rawDates.split(/\n|,/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => toLocalYMD(line) || toLocalYMD(new Date(line)))
        .filter(Boolean))).sort();
    if (!meetingDates.length) return notify("Please enter at least one meeting date.", "error");
    if (reviewerPool.length < reviewerCount) return notify("Reviewer pool must be at least the reviewers-per-proposal value.", "error");

    const tab = app.activeTab;
    if (!tab) return notify("No dataset selected.", "error");
    const matchCol = tab.matchColumn || tab.headers?.[0];
    if (!matchCol) return notify("No match column available.", "error");

    const projects = [...new Set((tab.data || [])
        .filter(r => !r._hidden)
        .map(r => String(r[matchCol] || "").trim())
        .filter(Boolean))];
    if (!projects.length) return notify("No visible projects to assign.", "error");

    const chunkSize = Math.max(1, Math.ceil(projects.length / meetingDates.length));
    let currentDateIndex = 0;
    let chunkCounter = 0;

    const combosUsed = new Set();
    let queueIndex = 0;

    const getNextCombo = () => {
        if (reviewerPool.length === 0) return [];
        if (reviewerPool.length === reviewerCount) return reviewerPool.slice();
        let fallback = reviewerPool.slice(0, reviewerCount);
        let attempts = 0;
        while (attempts < reviewerPool.length) {
            const combo = [];
            for (let i = 0; i < reviewerCount; i++) {
                combo.push(reviewerPool[(queueIndex + i) % reviewerPool.length]);
            }
            const key = combo.slice().sort().join("|");
            queueIndex = (queueIndex + 1) % reviewerPool.length;
            attempts++;
            if (!combosUsed.has(key)) {
                combosUsed.add(key);
                return combo;
            }
            if (attempts === 1) fallback = combo;
        }
        return fallback;
    };

    const newAssignments = {};
    const dueSaves = [];

    projects.forEach(project => {
        if (chunkCounter >= chunkSize && currentDateIndex < meetingDates.length - 1) {
            currentDateIndex++;
            chunkCounter = 0;
        }
        const dueDate = meetingDates[currentDateIndex];
        chunkCounter++;

        const reviewers = getNextCombo();
        newAssignments[project] = reviewers;
        app.proposalDue[project] = dueDate;
        dueSaves.push(storage.saveProposalField(app.selectedId, project, { dueDate }));
    });

    await Promise.all(dueSaves);
    await storage.saveAssignments(app.selectedId, newAssignments);
    app.assignments = newAssignments;
    app.autoAssignConfig = {
        meetingDates,
        reviewerCount,
        reviewerPool
    };

    closeAutoAssignModal();
    if (rerenderTracker) rerenderTracker();
    if (rerenderDashboard) rerenderDashboard();
    notify("Automatic assignment completed.", "success");
}
