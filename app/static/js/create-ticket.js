const form = document.querySelector("#create-ticket-form");
const submitButton = document.querySelector("#submit-button");
const formMessage = document.querySelector("#form-message");


function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `rounded-lg px-4 py-3 text-sm ${
    type === "success"
      ? "bg-green-50 text-green-700"
      : "bg-red-50 text-red-700"
  }`;
}


form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);

  const ticketData = {
    customer_name: formData.get("customer_name").trim(),
    customer_email: formData.get("customer_email").trim(),
    subject: formData.get("subject").trim(),
    description: formData.get("description").trim(),
  };

  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  try {
    const response = await fetch("/api/tickets/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ticketData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error("Please check the form fields and try again.");
    }

    showMessage(
      `Ticket ${result.ticket_number} created successfully. Redirecting to dashboard...`,
      "success"
    );

    form.reset();

    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
  } catch (error) {
    showMessage(error.message, "error");
    submitButton.disabled = false;
    submitButton.textContent = "Submit ticket";
  }
});