/**
 * Main Application Module
 *
 * This module handles password authentication, app state management,
 * navigation, and orchestrates all other modules.
 */

import { $, setText, esc, attr, showEl, notify } from './utils.js';
import { storage } from './storage.js';
import { mountSurveyUI, mountTrackerUI, mountApprovedUI, mountModal } from './ui-builders.js';
import { renderDashboard, renderReviewerDashboard } from './dashboard.js';
import {
    renderData,
    autoDetectMatchColumn,
    setMatchColumn,
    updateMatchControlsUI,
    app_toggleHideDataRow,
    deleteActiveTab,
    downloadActiveCSV,
    replaceXLSX,
    uploadXLSX
} from './data.js';
import {
    findProposalUrlByName,
    updateSurveyProposalLink,
    renderSurvey,
    submitSurvey,
    exportSurveys,
    refreshSurveyTypeahead,
    updateSurveyProjectMeta,
    autofillReviewerName
} from './survey.js';
import {
    renderTracker,
    openAutoAssignModal,
    closeAutoAssignModal,
    runAutoAssign,
    sendTrackerReminderEmails,
    clearAllAssignments
} from './tracker.js';
import { renderApproved, exportApproved, remapApproved } from './approved.js';
import { openDetail } from './modal.js';

const USE_EMAIL_AUTH = true;

// === Firebase Auth ===
let bootPromise = null;
function initAuth() {
    if (!USE_EMAIL_AUTH) return;
    $("authGo").onclick = handleSignIn;
    const passwordInput = $("authPassword");
    if (passwordInput) passwordInput.addEventListener("keypress", e => { if (e.key === "Enter") handleSignIn(); });
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            app.user = user;
            $("authEmail").value = "";
            $("authPassword").value = "";
            showEl("auth", false);
            $("user-pill") && ($("user-pill").textContent = user.displayName || user.email || "Signed in");
            if (!bootPromise) {
                bootPromise = boot();
            } else {
                renderTop();
            }
        } else {
            app.user = null;
            showEl("auth", true);
            $("user-pill") && ($("user-pill").textContent = "Not signed in");
        }
    });
}

async function handleSignIn() {
    const email = ($("authEmail")?.value || "").trim();
    const password = $("authPassword")?.value || "";
    const err = $("authErr");
    if (!email || !password) {
        if (err) { err.style.display = "block"; err.textContent = "Enter email and password."; }
        return;
    }
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        if (err) err.style.display = "none";
    } catch (e) {
        if (err) {
            err.style.display = "block";
            err.textContent = e?.message || "Sign-in failed";
        }
    }
}

function handleSignOut() {
    firebase.auth().signOut();
}

function initLocalAuth() {
    if (USE_EMAIL_AUTH) return;
    const access = async () => {
        const input = ($("pass")?.value || "").trim();
        if (input === "eef2025") {
            app.user = app.user || { displayName: "Local Tester", email: "local@test" };
            showEl("auth", false);
            $("user-pill") && ($("user-pill").textContent = "Local mode");
            if (!bootPromise) {
                bootPromise = boot();
            }
        } else {
            const err = $("authErr");
            if (err) {
                err.style.display = "block";
                err.textContent = "Incorrect password";
                setTimeout(() => (err.style.display = "none"), 2000);
            }
        }
    };
    $("authGo")?.addEventListener("click", access);
    $("pass")?.addEventListener("keypress", (e) => { if (e.key === "Enter") access(); });
}

// === App state ===
const app = {
    tabs: [], selectedId: null,
    user: null,
    surveys: [], assignments: {}, // <- current dataset's assignments map
    approved: { headers: ["Project Name", "Email", "Requested Amount", "Given Amount", "Funding Status", "Notes"], data: [] },
    proposalAmounts: {}, proposalNotes: {}, proposalStatus: {}, proposalDue: {},
    editingSurveyId: null, assigneeQuery: "",
    autoAssignConfig: { meetingDates: [], reviewerCount: 2, reviewerPool: [] },
    reviewerDirectory: {},
    lastReloadAt: null,
    dataFilters: {},
    dataSearch: "",
    pinnedColumns: new Set(),
    _currentProject: null,
    get activeTab() { return this.tabs.find(t => t.id === this.selectedId) || null; },
    isAmountHeader: h => /amount|requested|price|cost|budget|funds?/i.test(String(h || "")),
};

function boundOpenDetail(project) {
    openDetail(project, app, renderApproved, refreshTracker, renderDashboard);
}

function refreshTracker() {
    renderTracker(app, renderReviewerDashboard, boundOpenDetail);
}

// Make app globally accessible for legacy code
window.app = app;

// === Build header controls (dataset select + pill) ===
(function ensureHeaderControls() {
    const bar = document.querySelector("header .bar");
    if (!bar || document.getElementById("selDataset")) return;
    const wrap = document.createElement("div");
    wrap.className = "top-controls flex gap-10";
    wrap.style.alignItems = "center";
    wrap.innerHTML = `
        <span id="pill" class="pill">Dataset: (none)</span>
        <div class="dataset-combobox">
            <input id="dataset-search" placeholder="Search datasets…" list="dataset-options" autocomplete="off">
            <datalist id="dataset-options"></datalist>
        </div>
        <select id="selDataset" class="select-compact" style="display:none"></select>
        <div class="dataset-meta">
            <span id="dataset-refresh">Last refresh: —</span>
            <span id="dataset-rows">Rows: —</span>
        </div>
        <div class="dataset-actions">
            <button id="dataset-duplicate" class="btn btn-sm">Duplicate</button>
            <button id="dataset-archive" class="btn btn-sm btn-danger">Archive</button>
        </div>
        <div class="user-controls">
            <span id="user-pill" class="pill pill-muted">Not signed in</span>
            <button id="signOut" class="btn btn-sm">Sign out</button>
        </div>
    `;
    bar.appendChild(wrap);
})();

// === Boot (dataset-scoped loads) ===
async function boot() {
    mountSurveyUI();
    mountTrackerUI();
    mountApprovedUI();
    mountModal();

    ["Dashboard", "Data", "Survey", "Tracker", "Approved"].forEach(n => {
        $("tab-" + n).onclick = () => showSection(n);
    });

    // Load tabs, UI config, and the reviewer directory used for email reminders
    const [tabs, ui, reviewerDirectory] = await Promise.all([
        storage.loadTabs(),
        storage.loadUIConfig(),
        storage.loadReviewerDirectory(),
    ]);

    app.tabs = tabs;
    app.reviewerDirectory = reviewerDirectory || {};

    const savedId = ui?.selectedDatasetId;
    app.selectedId = (savedId && app.tabs.some(t => t.id === savedId))
        ? savedId
        : (app.tabs[0]?.id || null);

    // Load everything *within* the selected dataset
    await reloadCurrentDataset(); // fills surveys, assignments, approved, proposal meta

    bindUI();
    renderAll();
    notify("EEF Manager Ready", "success");
}

// Reload only the active dataset's data (single implementation)
async function reloadCurrentDataset() {
    const id = app.selectedId;
    if (!id) {
        app.surveys = [];
        app.assignments = {};
        app.approved.data = [];
        app.proposalAmounts = {};
        app.proposalNotes = {};
        app.proposalStatus = {};
        app.proposalDue = {};
        renderAll();
        app.lastReloadAt = new Date();
        return;
    }
    const [surveys, assignments, approvedRows, meta] = await Promise.all([
        storage.loadSurveys(id),
        storage.loadAssignments(id),
        storage.loadApprovedData(id),
        storage.loadProposalMeta(id),
    ]);

    app.surveys = surveys;
    app.assignments = assignments; // scoped to current dataset
    app.approved.data = approvedRows;
    app.proposalAmounts = meta.amounts;
    app.proposalNotes = meta.notes;
    app.proposalStatus = meta.status;
    app.proposalDue = meta.due;
    app.lastReloadAt = new Date();
    renderAll();
    notify(`Dataset "${app.activeTab?.name || id}" reloaded`, "info");
}

// === Navigation + Render orchestration ===
function showSection(name) {
    const ids = ["Dashboard", "Data", "Survey", "Tracker", "Approved"];
    ids.forEach(n => {
        const el = document.getElementById("view-" + n);
        if (el) el.classList.toggle("hidden", n !== name);
        const tabBtn = document.getElementById("tab-" + n);
        if (tabBtn) tabBtn.classList.toggle("active", n === name);
    });
    renderTop();
    if (name === "Dashboard") renderDashboard(app);
    if (name === "Data") renderData(app, setMatchColumn, updateMatchControlsUI, updateSurveyProposalLink);
    if (name === "Survey") {
        renderSurvey(app, ($("svy-filter")?.value || "").trim().toLowerCase());
        updateSurveyProposalLink(app, findProposalUrlByName);
        refreshSurveyTypeahead(app);
        updateSurveyProjectMeta(app, ($("svy-projectName")?.value || "").trim());
        autofillReviewerName(app);
    }
    if (name === "Tracker") refreshTracker();
    if (name === "Approved") renderApproved(app, openDetail);
}

// Make showSection globally accessible
window.showSection = showSection;

function renderAll() {
    renderTop();
    renderDashboard(app);
    renderData(app, setMatchColumn, updateMatchControlsUI, updateSurveyProposalLink);
    renderSurvey(app, "");
    refreshSurveyTypeahead(app);
    updateSurveyProposalLink(app, findProposalUrlByName);
    updateSurveyProjectMeta(app, ($("svy-projectName")?.value || "").trim());
    autofillReviewerName(app);
    refreshTracker();
    renderApproved(app, openDetail);
}

function renderTop() {
    const sel = $("selDataset");
    if (sel) {
        sel.innerHTML = app.tabs.map(t => `<option value="${attr(t.id)}">${esc(t.name)}</option>`).join("");
        sel.value = app.selectedId || "";
    }
    const pill = $("pill");
    if (pill) pill.textContent = "Dataset: " + (app.activeTab ? app.activeTab.name : "(none)");
    const rows = $("dataset-rows");
    if (rows) {
        const rowCount = Array.isArray(app.activeTab?.data) ? app.activeTab.data.length : (app.activeTab?.rowCount ?? 0);
        rows.textContent = "Rows: " + rowCount;
    }
    const refresh = $("dataset-refresh");
    if (refresh) {
        const ts = app.lastReloadAt ? new Date(app.lastReloadAt).toLocaleTimeString() : "—";
        refresh.textContent = "Last refresh: " + ts;
    }
    const archiveBtn = $("dataset-archive");
    if (archiveBtn) {
        archiveBtn.textContent = app.activeTab?.archived ? "Unarchive" : "Archive";
        archiveBtn.classList.toggle("btn-danger", !app.activeTab?.archived);
        archiveBtn.classList.toggle("btn-primary", !!app.activeTab?.archived);
    }
    const dataList = $("dataset-options");
    if (dataList) {
        dataList.innerHTML = app.tabs.map((t, idx) => {
            const rowCount = Array.isArray(t.data) ? t.data.length : (t.rowCount ?? 0);
            const meta = `${rowCount} row${rowCount === 1 ? "" : "s"}${t.archived ? " • archived" : ""}`;
            const name = t.name || `Dataset ${idx + 1}`;
            return `<option value="${attr(name)}" label="${attr(name + " — " + meta)}"></option>`;
        }).join("");
    }
    const searchInput = $("dataset-search");
    if (searchInput && document.activeElement !== searchInput) {
        searchInput.value = app.activeTab?.name || "";
    }
    if (searchInput) {
        searchInput.placeholder = `Search ${app.tabs.length || 0} datasets…`;
    }
}

// === Bind UI ===
function bindUI() {
    // Dashboard
    $("upload").onclick = () => uploadXLSX(app, autoDetectMatchColumn, reloadCurrentDataset, renderAll);

    // Data
    $("dl-csv").onclick = () => downloadActiveCSV(app);
    $("replace-xlsx").onclick = () => replaceXLSX(app, autoDetectMatchColumn, renderAll);
    $("del-tab").onclick = () => deleteActiveTab(app, reloadCurrentDataset, renderAll);

    // Survey submit
    const form = $("survey");
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            await submitSurvey(fd, app, renderSurvey, refreshTracker, renderDashboard, updateSurveyProposalLink);
            notify("Review submitted", "success");
        };
    }
    const handleProjectInput = (value) => {
        const name = (value || "").trim();
        if ($("svy-filter")) $("svy-filter").value = name;
        updateSurveyProposalLink(app, findProposalUrlByName);
        renderSurvey(app, name.toLowerCase());
        updateSurveyProjectMeta(app, name);
    };
    $("survey-container").addEventListener("input", (e) => {
        if (e.target && e.target.id === "svy-projectName") handleProjectInput(e.target.value);
    });
    $("survey-container").addEventListener("change", (e) => {
        if (e.target && e.target.id === "svy-projectName") handleProjectInput(e.target.value);
    });
    const reviewerInput = document.querySelector("#survey input[name='reviewerName']");
    if (reviewerInput) reviewerInput.addEventListener("input", () => reviewerInput.dataset.autofill = "0");
    $("svy-do").onclick = () => renderSurvey(app, ($("svy-filter")?.value || "").trim().toLowerCase());
    $("svy-clr").onclick = () => { $("svy-filter").value = ""; renderSurvey(app, ""); };
    $("svy-exp").onclick = () => exportSurveys(app);

    // Dataset selector with inline rename on double-click
    const sel = $("selDataset");
    if (sel) {
        sel.onchange = async () => {
            await switchDataset(sel.value);
        };

        // Inline rename
        sel.addEventListener("dblclick", async () => {
            const tabId = sel.value;
            if (!tabId) return;
            const currentName = sel.options[sel.selectedIndex].text;
            const input = document.createElement("input");
            input.type = "text"; input.value = currentName; input.className = "input";
            input.style.width = "180px"; input.style.marginLeft = "8px";
            sel.style.display = "none";
            sel.parentNode.insertBefore(input, sel.nextSibling);
            input.focus();

            const saveName = async () => {
                const newName = input.value.trim();
                if (newName && newName !== currentName) {
                    await db.collection("tabs").doc(tabId).set({ datasetName: newName, name: newName }, { merge: true });
                    const tab = app.tabs.find(t => t.id === tabId);
                    if (tab) tab.name = newName;
                    sel.options[sel.selectedIndex].text = newName;
                    notify(`Dataset renamed to "${newName}"`, "success");
                    renderTop();
                }
                input.remove(); sel.style.display = "";
            };

            input.addEventListener("blur", saveName);
            input.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") saveName();
                if (ev.key === "Escape") { input.remove(); sel.style.display = ""; }
            });
        });
    }
    const datasetSearch = $("dataset-search");
    if (datasetSearch) {
        const pickDataset = async () => {
            const val = datasetSearch.value.trim();
            if (!val) return;
            const lower = val.toLowerCase();
            const match = app.tabs.find(t => (t.name || "").toLowerCase() === lower)
                || app.tabs.find(t => (t.name || "").toLowerCase().includes(lower));
            if (match) {
                await switchDataset(match.id);
                datasetSearch.blur();
            }
        };
        datasetSearch.addEventListener("change", pickDataset);
        datasetSearch.addEventListener("keydown", async (ev) => { if (ev.key === "Enter") await pickDataset(); });
    }
    const dupBtn = $("dataset-duplicate");
    if (dupBtn) dupBtn.onclick = () => duplicateActiveDataset(app, reloadCurrentDataset, renderAll);
    const archiveBtn = $("dataset-archive");
    if (archiveBtn) archiveBtn.onclick = () => toggleArchiveActiveDataset(app, renderTop);
    const signOutBtn = $("signOut");
    if (signOutBtn) {
        if (USE_EMAIL_AUTH) signOutBtn.onclick = handleSignOut;
        else signOutBtn.style.display = "none";
    }

    // Tracker
    $("trk-refresh").onclick = refreshTracker;
    const autoBtn = $("trk-auto");
    if (autoBtn) autoBtn.onclick = () => openAutoAssignModal(app);
    const clearBtn = $("trk-clear");
    if (clearBtn) clearBtn.onclick = () => clearAllAssignments(app, refreshTracker, () => renderDashboard(app));
    const emailBtn = $("trk-email");
    if (emailBtn) emailBtn.onclick = () => sendTrackerReminderEmails(app);
    ["auto-close", "auto-cancel"].forEach(id => {
        const btn = $(id);
        if (btn) btn.onclick = () => closeAutoAssignModal();
    });
    const autoRun = $("auto-run");
    if (autoRun) autoRun.onclick = () => runAutoAssign(
        app,
        refreshTracker,
        () => renderDashboard(app)
    );
    $("trk-q").oninput = (e) => { app.assigneeQuery = (e.target.value || "").toLowerCase(); refreshTracker(); };
    $("trk-q-clr").onclick = () => { app.assigneeQuery = ""; $("trk-q").value = ""; refreshTracker(); };

    // Approved
    $("ap-exp").onclick = () => exportApproved(app);
    if ($("ap-remap")) $("ap-remap").onclick = () => remapApproved(app, renderApproved, renderDashboard);

    // Combined header shadows on scroll (single handler)
    document.addEventListener("scroll", (ev) => {
        const wrapTracker = document.querySelector("#view-Tracker .table-wrap");
        if (wrapTracker) wrapTracker.classList.toggle("scrolled", wrapTracker.scrollTop > 2);
        const wrapData = document.querySelector("#view-Data .table-wrap");
        if (wrapData) wrapData.classList.toggle("scrolled", wrapData.scrollTop > 2);
    }, true);
}

async function switchDataset(id) {
    if (!id || id === app.selectedId) return;
    app.selectedId = id;
    app.dataFilters = {};
    app.dataSearch = "";
    await storage.saveUIConfig({ selectedDatasetId: app.selectedId });
    await reloadCurrentDataset();
    renderAll();
    updateSurveyProposalLink(app, findProposalUrlByName);
}

async function duplicateActiveDataset(app, reloadCurrentDataset, renderAll) {
    const tab = app.activeTab;
    if (!tab) return notify("No dataset selected", "error");
    const clone = JSON.parse(JSON.stringify(tab));
    clone.id = "dt_" + Date.now();
    clone.name = `${tab.name} Copy`;
    clone.created = new Date().toISOString();
    clone.archived = false;
    await storage.saveTab(clone);
    app.tabs = await storage.loadTabs();
    app.selectedId = clone.id;
    await storage.saveUIConfig({ selectedDatasetId: clone.id });
    await reloadCurrentDataset();
    renderAll();
    notify(`Duplicated "${tab.name}"`, "success");
}

async function toggleArchiveActiveDataset(app, renderTopFn) {
    const tab = app.activeTab;
    if (!tab) return notify("No dataset selected", "error");
    const nextState = !tab.archived;
    if (!confirm(`${nextState ? "Archive" : "Restore"} dataset "${tab.name}"?`)) return;
    tab.archived = nextState;
    tab.archivedAt = nextState ? new Date().toISOString() : null;
    await storage.saveTab(tab);
    app.tabs = await storage.loadTabs();
    const msg = nextState ? "Dataset archived" : "Dataset restored";
    notify(msg, nextState ? "info" : "success");
    renderTopFn();
}

// Make global functions accessible for window calls
window.app_toggleHideDataRow = (rowIndex) => app_toggleHideDataRow(rowIndex, app, renderData, refreshTracker);
window.app_openDetailFromData = (project) => {
    showSection("Tracker");
    boundOpenDetail(project);
};
window.openDetail = boundOpenDetail;

// === Event listeners on load ===
document.addEventListener("DOMContentLoaded", () => {
    if (USE_EMAIL_AUTH) initAuth();
    else initLocalAuth();
});

// Export app for other modules
export default app;
