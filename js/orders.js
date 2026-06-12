/* =========================================================
   js/orders.js  —  Orders page logic
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  renderOrders();
});

function renderOrders() {
  const orders    = getOrders();
  const container = document.getElementById("orders-container");
  const emptyMsg  = document.getElementById("orders-empty");

  if (!orders.length) {
    container.innerHTML = "";
    emptyMsg.style.display = "block";
    return;
  }

  emptyMsg.style.display = "none";
  container.innerHTML = orders.map(order => renderOrderCard(order)).join("");

  // Toggle details accordion
  container.querySelectorAll(".order-card__toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const details = btn.closest(".order-card").querySelector(".order-card__details");
      const open    = details.style.display !== "none";
      details.style.display = open ? "none" : "block";
      btn.textContent = open ? "Show Details ▾" : "Hide Details ▴";
    });
  });
}

function renderOrderCard(order) {
  const date = new Date(order.timestamp).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  });
  const itemsHtml = order.items.map(item => {
    const variantLabel = item.variant ? ` (${item.variant})` : "";
    return `
      <tr>
        <td>${item.name}${variantLabel}</td>
        <td class="text-center">${item.qty}</td>
        <td class="text-right">${formatPrice(item.price)}</td>
        <td class="text-right">${formatPrice(item.price * item.qty)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="order-card">
      <div class="order-card__header">
        <div class="order-card__meta">
          <span class="order-card__id">Order #${order.id}</span>
          <span class="order-card__date">${date}</span>
        </div>
        <div class="order-card__header-right">
          <span class="order-badge order-badge--${order.status}">${statusLabel(order.status)}</span>
          <button class="order-card__toggle">Show Details ▾</button>
        </div>
      </div>
      <div class="order-card__details" style="display:none">
        <div class="order-card__customer">
          <p><strong>Name:</strong> ${order.customer.name}</p>
          <p><strong>Phone:</strong> ${order.customer.phone}</p>
          <p><strong>City:</strong> ${order.customer.city}</p>
          <p><strong>Address:</strong> ${order.customer.address}</p>
          ${order.customer.notes ? `<p><strong>Notes:</strong> ${order.customer.notes}</p>` : ""}
        </div>
        <table class="order-items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th class="text-center">Qty</th>
              <th class="text-right">Unit</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="text-right">Subtotal</td>
              <td class="text-right">${formatPrice(order.subtotal)}</td>
            </tr>
            <tr>
              <td colspan="3" class="text-right">Delivery</td>
              <td class="text-right">${order.delivery === 0 ? "Free" : formatPrice(order.delivery)}</td>
            </tr>
            <tr class="order-total-row">
              <td colspan="3" class="text-right"><strong>Grand Total</strong></td>
              <td class="text-right"><strong>${formatPrice(order.total)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;
}

function statusLabel(status) {
  const map = {
    pending_whatsapp: "Pending WhatsApp Confirmation",
    confirmed:        "Confirmed",
    shipped:          "Shipped",
    delivered:        "Delivered",
    cancelled:        "Cancelled"
  };
  return map[status] || status;
}
