/* =========================================================
   js/utils.js  —  Shared helper functions
   ========================================================= */

/**
 * Format a number as PKR currency string.
 * @param {number} amount
 * @returns {string}  e.g. "PKR 8,500"
 */
function formatPrice(amount) {
  return CONFIG.CURRENCY + " " + Number(amount).toLocaleString("en-PK");
}

/**
 * Generate a short random order ID.
 * @returns {string}  e.g. "SS-A3F9"
 */
function generateOrderId() {
  return "SS-" + Math.random().toString(36).toUpperCase().slice(2, 6);
}

/**
 * Read the cart array from localStorage.
 * @returns {Array}
 */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("ss_cart")) || [];
  } catch {
    return [];
  }
}

/**
 * Save the cart array to localStorage.
 * @param {Array} cart
 */
function saveCart(cart) {
  localStorage.setItem("ss_cart", JSON.stringify(cart));
}

/**
 * Read saved orders from localStorage.
 * @returns {Array}
 */
function getOrders() {
  try {
    return JSON.parse(localStorage.getItem("ss_orders")) || [];
  } catch {
    return [];
  }
}

/**
 * Persist a new order object to localStorage.
 * @param {Object} order
 */
function saveOrder(order) {
  const orders = getOrders();
  orders.unshift(order);          // newest first
  localStorage.setItem("ss_orders", JSON.stringify(orders));
}

/**
 * Count total items in cart.
 * @returns {number}
 */
function cartItemCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Update cart badge(s) across all nav elements.
 */
function updateCartBadge() {
  const count = cartItemCount();
  document.querySelectorAll(".cart-badge").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "inline-flex" : "none";
  });
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {"success"|"error"|"info"} type
 */
function showToast(message, type = "success") {
  // Remove any existing toast
  const existing = document.getElementById("ss-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "ss-toast";
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { toast.classList.add("toast--visible"); });
  });

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

/**
 * Fetch products.json and return the array.
 * @returns {Promise<Array>}
 */
async function fetchProducts() {
  const res = await fetch("products.json");
  if (!res.ok) throw new Error("Could not load products.json");
  return res.json();
}

/**
 * Get a single product by id from an already-loaded array.
 * @param {Array} products
 * @param {string} id
 * @returns {Object|undefined}
 */
function findProduct(products, id) {
  return products.find(p => p.id === id);
}

/**
 * Calculate delivery fee based on subtotal.
 * @param {number} subtotal
 * @returns {number}
 */
function calcDelivery(subtotal) {
  if (CONFIG.FREE_DELIVERY_OVER !== null && subtotal >= CONFIG.FREE_DELIVERY_OVER) {
    return 0;
  }
  return CONFIG.DELIVERY_FEE;
}

/**
 * Build a placeholder image data-URI for missing product images.
 * @param {string} label
 * @returns {string}
 */
function placeholderSrc(label = "") {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e8ddd4'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='serif' font-size='18' fill='%23a0857a'%3E${encodeURIComponent(label || "No Image")}%3C/text%3E%3C/svg%3E`;
}

/**
 * Handle broken image src — replace with placeholder.
 * @param {HTMLImageElement} img
 * @param {string} [label]
 */
function onImgError(img, label) {
  img.onerror = null;
  img.src = placeholderSrc(label);
}
