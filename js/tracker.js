/**
 * Tracker Functions
 *
 * This module handles tracker tab operations including bulk assignment,
 * rendering tracker table with status/due date filtering and sorting,
 * and helper functions for tracker interactions.
 */

import { $, setText, esc, attr, notify, showEl, toLocalYMD, firstName } from './utils.js';
import { storage } from './storage.js';

// Global filter/sort state for tracker due date filter + sort
let activeStatusFilters = new Set();
let dueSort = null;
let trkDateFilter = ""; // yyyy-mm-dd or empty (stored as local date)

// Start bulk assign
export function startBulkAssign(app) {
    const name = prompt("Bulk Assign\n\nType a reviewer name to assign by clicking on rows:")?.trim();
    if (!name) return;
    app.bulk = { active: true, name, selected: new Set() };
    setText("bulk-name", name);
    showEl("bulk-hint", true);
}

// End bulk assign
export function endBulkAssign(app, renderTracker) {
    if (app.bulk) { app.bulk.active = false; app.bulk.selected.clear(); }
    showEl("bulk-hint", false);
    renderTracker();
}

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

        // row click toggles bulk selection
        tr.onclick = (e) => {
            // only toggle bulk selection if bulk mode active
            if (app.bulk?.active) {
                app_rowToggleBulk(project, tr, app);
            }
        };

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

window.app_rowToggleBulk = async (project, tr, app) => {
    if (!app.bulk || !app.bulk.active) return;
    const list = app.assignments[project] || [];
    const name = app.bulk.name;
    const i = list.indexOf(name);
    if (i >= 0) { list.splice(i, 1); tr.style.outline = ""; tr.style.background = ""; app.bulk.selected.delete(project); }
    else { list.push(name); tr.style.outline = "2px dashed #06B6D4"; tr.style.background = "rgba(6,182,212,.06)"; app.bulk.selected.add(project); }
    app.assignments[project] = [...new Set(list)];
    await storage.saveAssignments(app.selectedId, app.assignments);
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
