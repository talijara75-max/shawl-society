/* =========================================================
   js/products.js  —  Catalog + Product-detail page logic
   ========================================================= */

// ── CATALOG PAGE (index.html) ─────────────────────────────
if (document.getElementById("product-grid")) {
  let allProducts = [];
  let filtered    = [];

  document.addEventListener("DOMContentLoaded", async () => {
    updateCartBadge();
    try {
      allProducts = await fetchProducts();
    } catch (e) {
      console.error(e);
      document.getElementById("product-grid").innerHTML =
        `<p class="load-error">Could not load products. Please check products.json.</p>`;
      return;
    }
    filtered = [...allProducts];
    renderGrid(filtered);
    attachCatalogListeners();
  });

  function attachCatalogListeners() {
    document.getElementById("search-input").addEventListener("input", applyFilters);
    document.getElementById("sort-select").addEventListener("change", applyFilters);
  }

  function applyFilters() {
    const query = document.getElementById("search-input").value.toLowerCase();
    const sort  = document.getElementById("sort-select").value;

    filtered = allProducts.filter(p => {
      return !query || p.name.toLowerCase().includes(query) ||
             p.shortDescription.toLowerCase().includes(query);
    });

    if (sort === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    renderGrid(filtered);
  }

  function renderGrid(products) {
    const grid    = document.getElementById("product-grid");
    const countEl = document.getElementById("results-count");

    if (countEl) {
      countEl.textContent = products.length === 1
        ? "1 product"
        : `${products.length} products`;
    }

    if (!products.length) {
      grid.innerHTML = `<p class="no-results">No products match your search.</p>`;
      return;
    }

    grid.innerHTML = products.map(p => productCard(p)).join("");

    grid.querySelectorAll(".quick-add-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const id = btn.dataset.id;
        const product = findProduct(allProducts, id);
        if (!product || !product.inStock) return;
        // Always go to product page for Buy button
        window.location.href = `product.html?id=${id}`;
      });
    });
  }

  function productCard(p) {
    const imgSrc    = p.images && p.images[0] ? p.images[0] : placeholderSrc(p.name);
    const badge     = p.inStock ? "" : `<span class="badge badge--oos">Out of Stock</span>`;
    const featured  = p.featured ? `<span class="badge badge--featured">Featured</span>` : "";
    const compare   = p.compareAtPrice
      ? `<span class="price-compare">${formatPrice(p.compareAtPrice)}</span>` : "";
    const saleBadge = p.compareAtPrice
      ? `<span class="badge badge--sale">Sale</span>` : "";

    return `
      <a href="product.html?id=${p.id}" class="product-card">
        <div class="product-card__img-wrap">
          <img src="${imgSrc}" alt="${p.name}" class="product-card__img" loading="lazy"
               onerror="onImgError(this,'${p.name}')">
          <div class="product-card__badges">${featured}${saleBadge}${badge}</div>
        </div>
        <div class="product-card__body">
          <h3 class="product-card__name">${p.name}</h3>
          <p class="product-card__desc">${p.shortDescription}</p>
          <div class="product-card__pricing">
            <span class="price">${formatPrice(p.price)}</span>
            ${compare}
          </div>
          <button class="quick-add-btn btn btn--outline" data-id="${p.id}"
                  ${!p.inStock ? "disabled" : ""}>
            ${p.inStock ? "Buy" : "Out of Stock"}
          </button>
        </div>
      </a>
    `;
  }
}

// ── PRODUCT DETAIL PAGE (product.html) ───────────────────
if (document.getElementById("product-detail")) {
  let products = [];
  let currentProduct = null;

  document.addEventListener("DOMContentLoaded", async () => {
    updateCartBadge();
    const params = new URLSearchParams(window.location.search);
    const id     = params.get("id");

    try {
      products = await fetchProducts();
    } catch (e) {
      document.getElementById("product-detail").innerHTML =
        `<p class="load-error">Could not load products.</p>`;
      return;
    }

    if (!id) { window.location.href = "index.html"; return; }

    currentProduct = findProduct(products, id);
    if (!currentProduct) { window.location.href = "index.html"; return; }

    renderProductDetail(currentProduct);
  });

  function renderProductDetail(p) {
    document.title = `${p.name} — ${CONFIG.STORE_NAME}`;

    renderGallery(p);

    // Hide category element
    const catEl = document.getElementById("pd-category");
    if (catEl) catEl.style.display = "none";

    document.getElementById("pd-name").textContent  = p.name;
    document.getElementById("pd-price").textContent = formatPrice(p.price);
    document.getElementById("pd-desc").textContent  = p.description;

    const comparEl = document.getElementById("pd-compare");
    if (p.compareAtPrice) {
      comparEl.textContent = formatPrice(p.compareAtPrice);
      comparEl.style.display = "inline";
    } else {
      comparEl.style.display = "none";
    }

    const stockEl = document.getElementById("pd-stock");
    stockEl.textContent = p.inStock ? "In Stock" : "Out of Stock";
    stockEl.className   = "pd-stock " + (p.inStock ? "pd-stock--in" : "pd-stock--out");

    // No variants rendered — colour options removed

    const addBtn = document.getElementById("add-to-cart-btn");
    addBtn.textContent = p.inStock ? "Buy" : "Out of Stock";
    if (!p.inStock) addBtn.disabled = true;
    addBtn.addEventListener("click", handleAddToCart);
  }

  function renderGallery(p) {
    const images = p.images && p.images.length ? p.images : [placeholderSrc(p.name)];
    const main   = document.getElementById("gallery-main");
    const thumbs = document.getElementById("gallery-thumbs");

    main.src = images[0];
    main.alt = p.name;
    main.onerror = () => onImgError(main, p.name);

    thumbs.innerHTML = images.map((src, i) => `
      <button class="thumb-btn ${i === 0 ? "thumb-btn--active" : ""}" data-src="${src}">
        <img src="${src}" alt="${p.name} view ${i + 1}"
             onerror="onImgError(this,'${p.name}')">
      </button>
    `).join("");

    thumbs.querySelectorAll(".thumb-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        main.src = btn.dataset.src;
        thumbs.querySelectorAll(".thumb-btn").forEach(b => b.classList.remove("thumb-btn--active"));
        btn.classList.add("thumb-btn--active");
      });
    });
  }

  function handleAddToCart() {
    if (!currentProduct || !currentProduct.inStock) return;
    addToCart(currentProduct, null, 1, currentProduct.price);
    showToast(`"${currentProduct.name}" added to cart 🛒`);
    updateCartBadge();
  }
}

/* ── Shared cart-add helper ─────────────────────────────── */
function addToCart(product, variantLabel, qty = 1, overridePrice = null) {
  const cart  = getCart();
  const price = overridePrice !== null ? overridePrice : product.price;

  const existing = cart.find(i => i.productId === product.id && (i.variant || "") === (variantLabel || ""));
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      productId: product.id,
      name:      product.name,
      price,
      variant:   variantLabel || null,
      qty
    });
  }
  saveCart(cart);
}
