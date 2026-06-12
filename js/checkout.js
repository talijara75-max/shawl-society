/* =========================================================
   js/checkout.js  —  Checkout page logic
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();

  const cart = getCart();

  if (!cart.length) {
    showToast("Your cart is empty.", "error");
    setTimeout(() => { window.location.href = "cart.html"; }, 1500);
    return;
  }

  buildCityDropdown();
  renderOrderPreview(cart);
  renderCheckoutSummary(cart);

  document.getElementById("whatsapp-btn").addEventListener("click", handlePlaceOrder);
});

function buildCityDropdown() {
  const select = document.getElementById("city");
  if (!select) return;
  CONFIG.CITY_LIST.forEach(city => {
    const opt = document.createElement("option");
    opt.value = city;
    opt.textContent = city;
    select.appendChild(opt);
  });
}

function renderOrderPreview(cart) {
  const list = document.getElementById("order-preview-items");
  if (!list) return;
  list.innerHTML = cart.map(item => `
    <li class="preview-item">
      <span class="preview-item__name">${item.name} × ${item.qty}</span>
      <span class="preview-item__total">${formatPrice(item.price * item.qty)}</span>
    </li>
  `).join("");
}

function renderCheckoutSummary(cart) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = calcDelivery(subtotal);
  const total    = subtotal + delivery;

  document.getElementById("co-subtotal").textContent = formatPrice(subtotal);
  document.getElementById("co-delivery").textContent = delivery === 0 ? "Free" : formatPrice(delivery);
  document.getElementById("co-total").textContent    = formatPrice(total);
}

function handlePlaceOrder() {
  const cart = getCart();
  if (!cart.length) { showToast("Your cart is empty.", "error"); return; }

  const name    = document.getElementById("full-name").value.trim();
  const phone   = document.getElementById("phone").value.trim();
  const city    = document.getElementById("city").value;
  const address = document.getElementById("address").value.trim();
  const notes   = document.getElementById("notes").value.trim();

  if (!name)             { showToast("Please enter your full name.", "error"); return; }
  if (!phone)            { showToast("Please enter your phone number.", "error"); return; }
  if (!city || city === "") { showToast("Please select your city.", "error"); return; }
  if (!address)          { showToast("Please enter your delivery address.", "error"); return; }

  const subtotal  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery  = calcDelivery(subtotal);
  const total     = subtotal + delivery;
  const orderId   = generateOrderId();
  const timestamp = new Date().toISOString();

  const order = {
    id: orderId, timestamp,
    status: "pending_whatsapp",
    customer: { name, phone, city, address, notes },
    items: cart, subtotal, delivery, total
  };

  const message = buildWhatsAppMessage(order);
  const waUrl   = `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  saveOrder(order);
  saveCart([]);
  updateCartBadge();
  window.open(waUrl, "_blank");
  showConfirmation(orderId);
}

function buildWhatsAppMessage(order) {
  const lines = [];
  lines.push(`🛍️ *${CONFIG.STORE_NAME}* — New Order`);
  lines.push(`Order ID: *${order.id}*`);
  lines.push(`Date: ${new Date(order.timestamp).toLocaleString("en-PK")}`);
  lines.push("");
  lines.push("*Customer Details*");
  lines.push(`Name: ${order.customer.name}`);
  lines.push(`Phone: ${order.customer.phone}`);
  lines.push(`City: ${order.customer.city}`);
  lines.push(`Address: ${order.customer.address}`);
  if (order.customer.notes) {
    lines.push(`Notes: ${order.customer.notes}`);
  }
  lines.push("");
  lines.push("*Items Ordered*");
  order.items.forEach(item => {
    lines.push(
      `• ${item.name} × ${item.qty}  —  ${CONFIG.CURRENCY} ${item.price.toLocaleString()} each  =  ${CONFIG.CURRENCY} ${(item.price * item.qty).toLocaleString()}`
    );
  });
  lines.push("");
  lines.push(`Subtotal:  ${formatPrice(order.subtotal)}`);
  lines.push(`Delivery:  ${order.delivery === 0 ? "Free" : formatPrice(order.delivery)}`);
  lines.push(`*Grand Total:  ${formatPrice(order.total)}*`);
  lines.push("");
  lines.push(`💳 Please pay *${formatPrice(order.total)}* through Easypaisa account *03432111101*`);
  lines.push("");
  lines.push("Please confirm this order. Thank you! 🙏");
  return lines.join("\n");
}

function showConfirmation(orderId) {
  document.getElementById("checkout-form-section").style.display = "none";
  const conf = document.getElementById("confirmation-section");
  conf.style.display = "block";
  document.getElementById("conf-order-id").textContent = orderId;
}
