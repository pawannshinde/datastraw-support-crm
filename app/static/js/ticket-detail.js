const ticketIdBadge = document.querySelector("#ticket-id-badge");
const ticketSubject = document.querySelector("#ticket-subject");
const ticketDescription = document.querySelector("#ticket-description");
const customerName = document.querySelector("#customer-name");
const customerEmail = document.querySelector("#customer-email");
const ticketCreated = document.querySelector("#ticket-created");
const statusSelect = document.querySelector("#status-update-select");

// Quick Edit DOM
const editFieldsDiv = document.querySelector("#quick-edit-fields");
const editCustNameInput = document.querySelector("#edit-cust-name");
const editCustEmailInput = document.querySelector("#edit-cust-email");
const saveCustBtn = document.querySelector("#save-cust-info-btn");

// Comments DOM
const commentTimeline = document.querySelector("#comments-timeline");
const commentInput = document.querySelector("#agent-comment-input");
const addCommentBtn = document.querySelector("#add-comment-btn");

// Extract the ticket number dynamically from the URL path (e.g., /tickets/TKT-181A74B9)
const pathParts = window.location.pathname.split("/");
const ticketNumber = pathParts[pathParts.length - 1];

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function formatTimelineTime(dateValue) {
  return new Date(dateValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 1. Fetch ticket records from backend API
async function fetchTicketDetails() {
  try {
    const response = await fetch(`/api/tickets/${ticketNumber}`);
    if (!response.ok) {
      throw new Error("Unable to locate ticket record sheet");
    }
    const ticket = await response.json();
    populateUI(ticket);
  } catch (error) {
    alert(error.message);
  }
}

// 2. Map data fields over matching screen DOM elements
function populateUI(ticket) {
  ticketIdBadge.textContent = ticket.ticket_number;
  ticketSubject.textContent = ticket.subject;
  ticketDescription.textContent = ticket.description;
  customerName.textContent = ticket.customer_name;
  customerEmail.textContent = ticket.customer_email;
  ticketCreated.textContent = formatDate(ticket.created_at);
  statusSelect.value = ticket.status;

  // Render notes line-by-line persistently
  if (ticket.notes && ticket.notes.length > 0) {
    commentTimeline.innerHTML = ticket.notes
      .map((note) => {
        const isSystem = note.note_text.startsWith("[Automation Tool");
        const cardClass = isSystem
          ? "rounded border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
          : "rounded border border-amber-100 bg-amber-50/20 p-3 dark:border-amber-900/40 dark:bg-amber-950/20";
        
        const typeLabel = isSystem ? "AGENT ACTION / SYSTEM LOG" : "AGENT REMARK";
        const colorLabel = isSystem ? "text-blue-500" : "text-amber-500";

        return `
          <div class="${cardClass}">
            <div class="flex justify-between font-bold text-xs ${colorLabel} mb-1">
              <span>${typeLabel}</span>
              <span>${formatTimelineTime(note.created_at)}</span>
            </div>
            <p class="text-xs text-slate-700 dark:text-slate-300">${note.note_text}</p>
          </div>
        `;
      })
      .join("");
  } else {
    commentTimeline.innerHTML = `
      <div class="rounded bg-slate-50 p-2 text-xs text-slate-400 dark:bg-slate-950/40 italic">
        * System initiated. No workspace actions or remarks logged.
      </div>
    `;
  }
}

// 3. Status Pipeline Synchronization Updates
statusSelect.addEventListener("change", async () => {
  try {
    const newStatus = statusSelect.value;
    const response = await fetch(`/api/tickets/${ticketNumber}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      throw new Error("Failed to advance ticket phase status");
    }

    // Push an automation log to database tracking the state update
    await runAgentTool(`Modified status to: [${newStatus}]`);
  } catch (error) {
    alert(error.message);
  }
});

// 4. Toggle Quick Edit Address Box overlay panels
function toggleEditAddress() {
  const isHidden = editFieldsDiv.classList.contains("hidden");

  if (isHidden) {
    editCustNameInput.value = customerName.textContent.trim();
    editCustEmailInput.value = customerEmail.textContent.trim();
    editFieldsDiv.classList.remove("hidden");
  } else {
    editFieldsDiv.classList.add("hidden");
  }
}

// 5. Submit client field detail adjustments to the DB
saveCustBtn.addEventListener("click", async () => {
  try {
    const updatedName = editCustNameInput.value.trim();
    const updatedEmail = editCustEmailInput.value.trim();

    if (!updatedName || !updatedEmail) {
      alert("Fields cannot remain blank during syncing updates");
      return;
    }

    const response = await fetch(`/api/tickets/${ticketNumber}/customer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: updatedName,
        customer_email: updatedEmail,
      }),
    });

    if (!response.ok) {
      throw new Error("Unable to save custom profile shifts.");
    }

    const resultTicket = await response.json();
    populateUI(resultTicket);
    editFieldsDiv.classList.add("hidden");

    await runAgentTool(`Updated customer metadata details.`);
  } catch (error) {
    alert(error.message);
  }
});

// Helper for logging automation tool events to database notes table
async function runAgentTool(actionText) {
  try {
    const response = await fetch(`/api/tickets/${ticketNumber}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note_text: `[Automation Tool Executed]: ${actionText}` }),
    });
    if (response.ok) {
      const resultTicket = await response.json();
      populateUI(resultTicket);
    }
  } catch (error) {
    console.error("Failed to log tool execution to notes table", error);
  }
}

// 6. Simulate outgoing client chats
function simulateChat() {
  const messageText = prompt("Type text to dispatch down to customer profile link logs:");
  if (messageText && messageText.trim()) {
    runAgentTool(`Outgoing Client Dispatch: "${messageText.trim()}"`);
  }
}

// 7. Write and save Custom Comments persistently
addCommentBtn.addEventListener("click", async () => {
  const commentText = commentInput.value.trim();
  if (!commentText) return;

  try {
    const response = await fetch(`/api/tickets/${ticketNumber}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note_text: commentText }),
    });

    if (!response.ok) {
      throw new Error("Failed to save remark note entry.");
    }

    const resultTicket = await response.json();
    populateUI(resultTicket);
    commentInput.value = "";
    commentTimeline.scrollTop = commentTimeline.scrollHeight;
  } catch (error) {
    alert(error.message);
  }
});

// Trigger setup boot routine
fetchTicketDetails();