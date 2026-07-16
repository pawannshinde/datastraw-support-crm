const searchInput = document.querySelector('input[type="search"]');
const statusSelect = document.querySelector("select");
const tableBody = document.querySelector("tbody");
const statNumbers = document.querySelectorAll("section.mb-8 .mt-2");
const themeToggle = document.querySelector("#theme-toggle");

let tickets = [];

function setTheme(theme) {
  const isDark = theme === "dark";

  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("support-crm-theme", theme);

  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

function initialiseTheme() {
  const savedTheme = localStorage.getItem("support-crm-theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  setTheme(savedTheme || (systemPrefersDark ? "dark" : "light"));
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function statusBadge(status) {
  const colors = {
    Open: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    "In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    Closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };

  const colorClass =
    colors[status] ||
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${colorClass}">${escapeHtml(status)}</span>`;
}

function renderTickets() {
  if (tickets.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
          No tickets found matching criteria.
        </td>
      </tr>
    `;
    statNumbers[0].textContent = "0";
    statNumbers[1].textContent = "0";
    statNumbers[2].textContent = "0";
    return;
  }

  const openCount = tickets.filter(t => t.status === "Open").length;
  const progressCount = tickets.filter(t => t.status === "In Progress").length;
  const closedCount = tickets.filter(t => t.status === "Closed").length;

  statNumbers[0].textContent = tickets.length;
  statNumbers[1].textContent = openCount;
  statNumbers[2].textContent = closedCount;

  tableBody.innerHTML = tickets.map(ticket => {

    const date = new Date(ticket.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    return `
      <tr
        onclick="window.location.href='/tickets/${ticket.ticket_number}'"
        class="cursor-pointer border-b border-slate-100 transition hover:bg-blue-50 hover:shadow-sm dark:border-slate-800 dark:hover:bg-slate-900/50"
        title="Click anywhere to open this ticket"
      >
        <td class="whitespace-nowrap px-4 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
          ${escapeHtml(ticket.ticket_number)}
        </td>

        <td class="px-4 py-4">
          <div class="text-sm font-medium text-slate-900 dark:text-white">
            ${escapeHtml(ticket.customer_name)}
          </div>
          <div class="text-xs text-slate-500 dark:text-slate-400">
            ${escapeHtml(ticket.customer_email)}
          </div>
        </td>

        <td class="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
          ${escapeHtml(ticket.subject)}
        </td>

        <td class="whitespace-nowrap px-4 py-4">
          ${statusBadge(ticket.status)}
        </td>

        <td class="whitespace-nowrap px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
          ${date}
        </td>
      </tr>
    `;
  }).join("");
}

async function fetchTickets() {
  try {
    const searchVal = searchInput.value.trim();
    const rawStatus = statusSelect.value;

    let formattedStatus = "";
    if (rawStatus === "open") formattedStatus = "Open";
    if (rawStatus === "in-progress") formattedStatus = "In Progress";
    if (rawStatus === "closed") formattedStatus = "Closed";

    const params = new URLSearchParams();

    if (searchVal) params.append("search", searchVal);
    if (rawStatus) params.append("status", formattedStatus);

    const response = await fetch(`/api/tickets/?${params.toString()}`);

    if (!response.ok) throw new Error("Could not load tickets.");

    tickets = await response.json();
    renderTickets();

  } catch (error) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-12 text-center text-red-600 dark:text-red-400">
          Could not load tickets. Please refresh and try again.
        </td>
      </tr>
    `;
  }
}

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.classList.contains("dark")
    ? "light"
    : "dark";

  setTheme(nextTheme);
});

let timeout = null;

searchInput.addEventListener("input", () => {
  clearTimeout(timeout);
  timeout = setTimeout(fetchTickets, 300);
});

statusSelect.addEventListener("change", fetchTickets);

initialiseTheme();
fetchTickets();