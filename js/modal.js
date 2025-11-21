/**
 * Modal Functions
 *
 * This module handles the detail modal operations including opening details,
 * approve/unapprove functionality, and autosave for internal notes.
 */

import { $, esc, notify } from './utils.js';
import { storage } from './storage.js';
import { clearModalToasts } from './ui-builders.js';
import { getProposalUrl } from './tracker.js';
import { detectSpeedtypeFromRow } from './survey.js';

// Open detail modal
export async function openDetail(project, app, renderApproved, renderTracker, renderDashboard) {
    const overlay = $("detail");
    overlay.classList.add("overlay");
    clearModalToasts();

    const tab = app.activeTab;
    if (!tab) return;
    const tabId = app.selectedId;
    const matchCol = tab.matchColumn;

    // --- Proposal Link ---
    const url = getProposalUrl(project, tab, matchCol);
    const linkBtn = $("dt-prop");
    const notesArea = $("dt-notes");
    const internalNote = $("dt-note");
    const title = $("dt-title");
    title.textContent = project;

    if (url) {
        linkBtn.href = url;
        linkBtn.style.display = "inline-flex";
    } else linkBtn.style.display = "none";

    // --- Internal Note Autosave (debounced, scoped per project) ---
    internalNote.value = app.proposalNotes[project] || "";
    app._currentProject = project; // ensure active tracking
    let noteSaveTimer = null;

    // Use .oninput to avoid registering multiple handlers across repeated opens
    internalNote.oninput = (e) => {
        clearTimeout(noteSaveTimer);
        const val = e.target.value;
        noteSaveTimer = setTimeout(async () => {
            const activeProj = app._currentProject;
            if (!activeProj) return;

            $("autosave-status").textContent = "Saving...";
            app.proposalNotes[activeProj] = val;

            await storage.saveProposalField(app.selectedId, activeProj, { notes: val });
            $("autosave-status").textContent = "Saved";

            setTimeout(() => ($("autosave-status").textContent = ""), 2500);
        }, 2500);
    };


    // --- Reviewer Notes (Collapsible) ---
    const related = app.surveys.filter(s => s.projectName === project);
    notesArea.innerHTML = related.length
        ? related.map((s, i) => {
            const timestamp = s.timestamp ? new Date(s.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
            }) : '';

            const initials = s.reviewerName ? s.reviewerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

            return `
            <div class="rev-card" id="rev-${i}">
                <div class="rev-header">
                    <div class="rev-header-left">
                        <div class="rev-avatar">${initials}</div>
                        <div class="rev-info">
                            <div class="rev-name">${esc(s.reviewerName)}</div>
                            <div class="rev-meta">
                                ${esc(s.projectType)} • ${esc(s.year)}${timestamp ? ` • ${timestamp}` : ''}
                            </div>
                        </div>
                    </div>
                    <span class="rev-arrow">▼</span>
                </div>
                <div class="rev-body">
                    ${s.overall ? `
                        <div class="rev-section">
                            <div class="rev-section-label">
                                <span class="rev-section-icon">💭</span>
                                <span>Overall Thoughts</span>
                            </div>
                            <div class="rev-section-content">${esc(s.overall)}</div>
                        </div>
                    ` : ""}
                    ${s.lineItems ? `
                        <div class="rev-section">
                            <div class="rev-section-label">
                                <span class="rev-section-icon">📋</span>
                                <span>Line Items</span>
                            </div>
                            <div class="rev-section-content">${esc(s.lineItems)}</div>
                        </div>
                    ` : ""}
                    ${s.funding ? `
                        <div class="rev-section">
                            <div class="rev-section-label">
                                <span class="rev-section-icon">💰</span>
                                <span>Funding Recommendation</span>
                            </div>
                            <div class="rev-section-content">${esc(s.funding)}</div>
                        </div>
                    ` : ""}
                    ${s.impact ? `
                        <div class="rev-section">
                            <div class="rev-section-label">
                                <span class="rev-section-icon">👥</span>
                                <span>Impact</span>
                            </div>
                            <div class="rev-section-content">${esc(s.impact)} people</div>
                        </div>
                    ` : ""}
                </div>
            </div>`;
        }).join("")
        : `<div class="rev-empty">
            <div class="rev-empty-icon">📝</div>
            <div class="rev-empty-text">No reviewer notes yet</div>
            <div class="rev-empty-subtext">Submit a review to see notes appear here</div>
        </div>`;

    notesArea.querySelectorAll(".rev-header").forEach(header => {
        header.addEventListener("click", () => {
            const body = header.nextElementSibling;
            const arrow = header.querySelector(".rev-arrow");
            const card = header.closest(".rev-card");
            const open = body.classList.toggle("open");
            card.classList.toggle("expanded");
            arrow.textContent = open ? "▲" : "▼";
        });
    });

    // --- Show modal + track current project ---
    overlay.classList.remove("hidden");
    app._currentProject = project; // remember which proposal the modal belongs to

    // Load the note tied to this project
    $("dt-note").value = app.proposalNotes[project] || "";

    // (Optional but helpful) clear status text when modal opens
    $("autosave-status").textContent = "";


    $("dt-status").value = app.proposalStatus[project] || "";
    $("dt-amount").value = app.proposalAmounts[project] || "";

    // --- Save Amount + Status ---
    $("dt-save-amount").onclick = async () => {
        const val = $("dt-amount").value;
        const status = $("dt-status").value;
        app.proposalAmounts[project] = val;
        app.proposalStatus[project] = status;
        $("amt-status").textContent = "Saving.";
        await storage.saveProposalField(app.selectedId, project, {
            givenAmount: val,
            fundingStatus: status
        });
        $("amt-status").textContent = "Saved";
        setTimeout(() => ($("amt-status").textContent = ""), 3000);
        renderTracker();
        renderDashboard();
    };




    // --- Approve / Unapprove Toggle ---
    const btn = $("dt-approve");
    const idx = app.approved.data.findIndex(r => r["Project Name"] === project);
    updateApproveButton(idx !== -1);

    btn.onclick = async () => {
        const existing = app.approved.data.findIndex(r => r["Project Name"] === project);
        const amt = $("dt-amount").value || "";
        const status = $("dt-status").value || "";
        const note = $("dt-note").value || "";
        const emailField = $("ap-email")?.value;
        const extraField = $("ap-extra")?.value;
        const matchRow = tab.data.find(r => r[tab.matchColumn] === project);
        const email = matchRow ? (emailField ? (matchRow[emailField] || "") : "") : "";
        const approvedExisting = app.approved.data.find(r => r["Project Name"] === project) || {};
        const detectedSpeed = detectSpeedtypeFromRow(matchRow || {}, approvedExisting, extraField);
        const speedtype = detectedSpeed || "";

        if (existing === -1) {
            const newRow = {
                "Project Name": project,
                "Email": email,
                "Requested Amount": matchRow ? matchRow["Requested Amount"] || "" : "",
                "Given Amount": amt,
                "Funding Status": status,
                "Notes": note,
                "Speedtype": speedtype
            };
            app.approved.data.push(newRow);
            await storage.saveApprovedData(tabId, app.approved.data);
            $("amt-status").textContent = "Approved ✓";
        } else {
            app.approved.data.splice(existing, 1);
            await storage.saveApprovedData(tabId, app.approved.data);
            $("amt-status").textContent = "Unapproved ✗";
        }

        updateApproveButton(existing === -1);
        renderApproved();
        renderTracker();
        renderDashboard();
        setTimeout(() => ($("amt-status").textContent = ""), 3000);
    };

    $("dt-x").onclick = () => {
        overlay.classList.remove("overlay");
        overlay.classList.add("hidden");
        clearModalToasts();
    };
}

// Update approve button state
export function updateApproveButton(isApproved) {
    const b = $("dt-approve");
    if (!b) return;
    if (isApproved) {
        b.textContent = "Unapprove";
        b.classList.remove("btn-success");
        b.classList.add("btn-danger");
    } else {
        b.textContent = "Approve";
        b.classList.remove("btn-danger");
        b.classList.add("btn-success");
    }
}
