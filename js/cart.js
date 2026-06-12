/* =========================================================
   js/cart.js  —  Cart page logic
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  updateCartBadge();

  let products = [];
  try {
    products = await fetchProducts();
  } catch (e) {
    console.error(e);
  }

  renderCart(products);
});

function renderCart(products) {
  const cart = getCart();
  const container = document.getElementById("cart-items");
  const emptyMsg  = document.getElementById("cart-empty");
  const summary   = document.getElementById("cart-summary");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (!cart.length) {
    container.innerHTML = "";
    emptyMsg.style.display  = "block";
    summary.style.display   = "none";
    return;
  }

  emptyMsg.style.display = "none";
  summary.style.display  = "block";

  container.innerHTML = cart.map(item => {
    const product = findProduct(products, item.productId);
    const imgSrc  = product && product.images && product.images[0]
      ? product.images[0]
      : placeholderSrc(item.name);

    const lineTotal = item.price * item.qty;
    const variantLabel = item.variant ? ` <span class="cart-item__variant">(${item.variant})</span>` : "";

    return `
      <div class="cart-item" data-id="${item.productId}" data-variant="${item.variant || ""}">
        <div class="cart-item__img-wrap">
          <img src="${imgSrc}" alt="${item.name}"
               onerror="onImgError(this,'${item.name}')" class="cart-item__img">
        </div>
        <div class="cart-item__details">
          <h3 class="cart-item__name">${item.name}${variantLabel}</h3>
          <p class="cart-item__unit-price">${formatPrice(item.price)} each</p>
          <div class="cart-item__qty-row">
            <button class="qty-btn" data-action="dec" data-id="${item.productId}" data-variant="${item.variant || ""}">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${item.productId}" data-variant="${item.variant || ""}">+</button>
            <button class="remove-btn" data-id="${item.productId}" data-variant="${item.variant || ""}">Remove</button>
          </div>
        </div>
        <div class="cart-item__line-total">${formatPrice(lineTotal)}</div>
      </div>
    `;
  }).join("");

  // Quantity / remove listeners
  container.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const { action, id, variant } = btn.dataset;
      adjustQty(id, variant, action === "inc" ? 1 : -1);
      renderCart(products);
      updateCartBadge();
    });
  });

  container.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      removeCartItem(btn.dataset.id, btn.dataset.variant);
      renderCart(products);
      updateCartBadge();
      showToast("Item removed", "info");
    });
  });

  renderSummary();

  checkoutBtn.addEventListener("click", () => {
    window.location.href = "checkout.html";
  });
}

function adjustQty(productId, variant, delta) {
  const cart = getCart();
  const idx  = cart.findIndex(i => i.productId === productId && (i.variant || "") === variant);
  if (idx === -1) return;
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  saveCart(cart);
}

function removeCartItem(productId, variant) {
  let cart = getCart();
  cart = cart.filter(i => !(i.productId === productId && (i.variant || "") === variant));
  saveCart(cart);
}

function renderSummary() {
  const cart     = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = calcDelivery(subtotal);
  const total    = subtotal + delivery;

  document.getElementById("summary-subtotal").textContent = formatPrice(subtotal);
  document.getElementById("summary-delivery").textContent = delivery === 0 ? "Free" : formatPrice(delivery);
  document.getElementById("summary-total").textContent    = formatPrice(total);

  const freeNote = document.getElementById("free-delivery-note");
  if (freeNote) {
    if (CONFIG.FREE_DELIVERY_OVER !== null && subtotal < CONFIG.FREE_DELIVERY_OVER) {
      const remaining = CONFIG.FREE_DELIVERY_OVER - subtotal;
      freeNote.textContent = `Add ${formatPrice(remaining)} more for free delivery!`;
      freeNote.style.display = "block";
    } else {
      freeNote.style.display = "none";
    }
  }
}
